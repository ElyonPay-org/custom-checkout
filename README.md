# @elyonpay/custom-checkout

SDK officiel pour intégrer le **Custom Checkout ElyonPay** dans vos applications **React** et **Vue.js**.

Contrairement au lien de paiement par redirection, le Custom Checkout vous permet de garder le contrôle total de l'interface utilisateur tout en utilisant les APIs ElyonPay pour gérer les paiements Mobile Money (MTN MoMo, Orange Money, Wave, Airtel, Moov…) et cartes bancaires (Visa, Mastercard).

---

## Installation

```bash
npm install @elyonpay/custom-checkout
```

> **Peer dependencies** : le package nécessite `react >= 17` (pour les hooks React) ou `vue >= 3.3` (pour les composables Vue). Installez seulement celui que vous utilisez.

---

## Flux de paiement en 4 étapes

| Étape | Description | API |
| --- | --- | --- |
| 1 | Récupérer les méthodes de paiement du pays du client | `GET /api/public/configuration/payments/{countryCode}` |
| 2 | Afficher votre checkout personnalisé | _Votre UI_ |
| 3 | Initier le paiement direct | `POST /api/mobile-money/payment/request` ou `POST /api/bankcard/payment/request` |
| 4 | Suivre le statut (polling) | `GET /api/transactions/{id}` toutes les 3-5s |

---

## Utilisation — Core (sans framework)

Le client core fonctionne dans n'importe quel environnement JavaScript/TypeScript (Node.js, navigateur, edge).

```ts
import { createElyonPayClient, pollTransaction } from "@elyonpay/custom-checkout";

const client = createElyonPayClient({
  token: "votre_jwt_token",       // obtenu via POST /api/login
  environment: "sandbox",          // "sandbox" | "production"
  lang: "fr",
});

// Étape 1 — Récupérer les méthodes de paiement (endpoint public, pas besoin d'auth)
const { payments } = await client.getPaymentMethods("CM");
console.log(payments);
// [
//   { name: "ORANGE_MONEY", label: "Orange Money", type: "MOBILE_MONEY", available: true },
//   { name: "MTN_MONEY",    label: "MTN Mobile Money", type: "MOBILE_MONEY", available: true },
//   { name: "STRIPE",       label: "Carte bancaire",  type: "CARD", available: true },
// ]

// Étape 3 — Initier un paiement direct
const result = await client.pay({
  amount: 15000,
  merchantName: "Ma Boutique",
  merchantId: 258,
  currency: "XAF",
  countryName: "Cameroon",
  beneficiaries: [{ id: 258 }],
  paymentMethod: "ORANGE_MONEY",
  customerMsisdn: "+237690000001",
});

console.log(result.transactionId); // 1553
console.log(result.state);         // "PENDING"

// Étape 4 — Polling du statut
const tx = await pollTransaction(client, result.transactionId, {
  intervalMs: 4000,   // toutes les 4s (défaut)
  timeoutMs: 120000,  // timeout après 2min (défaut)
});

if (tx.state === "DELIVERED") {
  console.log("Paiement réussi !");
} else {
  console.log("Paiement échoué :", tx.state);
}
```

---

## Utilisation — React

### 1. Wrapper avec `ElyonPayProvider`

```tsx
import { ElyonPayProvider } from "@elyonpay/custom-checkout/react";

function App() {
  return (
    <ElyonPayProvider
      token="votre_jwt_token"
      environment="sandbox"
      lang="fr"
    >
      <CheckoutPage />
    </ElyonPayProvider>
  );
}
```

### 2. Récupérer les méthodes de paiement

```tsx
import { usePaymentMethods } from "@elyonpay/custom-checkout/react";

function PaymentMethodPicker({ countryCode }: { countryCode: string }) {
  const { methods, loading, error } = usePaymentMethods(countryCode);

  if (loading) return <p>Chargement...</p>;
  if (error)   return <p>Erreur : {error.message}</p>;

  return (
    <ul>
      {methods.map((m) => (
        <li key={m.name}>
          {m.label} ({m.type})
        </li>
      ))}
    </ul>
  );
}
```

### 3. Paiement direct avec suivi automatique

```tsx
import { useDirectPayment } from "@elyonpay/custom-checkout/react";

function PayButton() {
  const { pay, status, transaction, error, reset } = useDirectPayment();

  const handlePay = () =>
    pay({
      amount: 15000,
      merchantName: "Ma Boutique",
      merchantId: 258,
      currency: "XAF",
      countryName: "Cameroon",
      beneficiaries: [{ id: 258 }],
      paymentMethod: "ORANGE_MONEY",
      customerMsisdn: "+237690000001",
    });

  return (
    <div>
      {status === "idle" && (
        <button onClick={handlePay}>Payer 15 000 XAF</button>
      )}

      {status === "initiating" && <p>Initialisation du paiement...</p>}

      {status === "polling" && (
        <p>
          En attente de confirmation...
          <br />
          Validez le paiement sur votre téléphone.
        </p>
      )}

      {status === "success" && (
        <div>
          <p>Paiement réussi !</p>
          <p>Montant : {transaction?.amount} {transaction?.currency}</p>
        </div>
      )}

      {status === "error" && (
        <div>
          <p>Le paiement a échoué : {error?.message}</p>
          <button onClick={reset}>Réessayer</button>
        </div>
      )}

      {status === "timeout" && (
        <div>
          <p>Délai d'attente dépassé. Veuillez vérifier votre téléphone.</p>
          <button onClick={reset}>Réessayer</button>
        </div>
      )}
    </div>
  );
}
```

### Exemple complet React

```tsx
import { ElyonPayProvider, usePaymentMethods, useDirectPayment } from "@elyonpay/custom-checkout/react";
import type { PaymentMethod } from "@elyonpay/custom-checkout/react";
import { useState } from "react";

function CheckoutPage() {
  const { methods, loading } = usePaymentMethods("CM");
  const { pay, status, transaction, error, reset } = useDirectPayment();
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState("");

  const handleSubmit = () => {
    if (!selected) return;
    pay({
      amount: 15000,
      merchantName: "Ma Boutique",
      merchantId: 258,
      currency: "XAF",
      countryName: "Cameroon",
      beneficiaries: [{ id: 258 }],
      paymentMethod: selected.name,
      customerMsisdn: phone,
    });
  };

  if (status === "success") {
    return <p>Paiement confirmé ! Transaction #{transaction?.id}</p>;
  }

  if (status === "error" || status === "timeout") {
    return (
      <div>
        <p>Échec : {error?.message}</p>
        <button onClick={reset}>Réessayer</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Choisissez un moyen de paiement</h2>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <ul>
          {methods.map((m) => (
            <li key={m.name}>
              <button
                onClick={() => setSelected(m)}
                style={{ fontWeight: selected?.name === m.name ? "bold" : "normal" }}
              >
                {m.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected?.type === "MOBILE_MONEY" && (
        <input
          type="tel"
          placeholder="+237..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected || status === "initiating" || status === "polling"}
      >
        {status === "polling" ? "En attente..." : "Payer 15 000 XAF"}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ElyonPayProvider token="votre_jwt" environment="sandbox">
      <CheckoutPage />
    </ElyonPayProvider>
  );
}
```

---

## Utilisation — Vue.js

### 1. Récupérer les méthodes de paiement

```vue
<script setup lang="ts">
import { createElyonPayClient } from "@elyonpay/custom-checkout";
import { usePaymentMethods } from "@elyonpay/custom-checkout/vue";

const client = createElyonPayClient({
  token: "votre_jwt_token",
  environment: "sandbox",
});

const { methods, loading, error } = usePaymentMethods(client, "CM");
</script>

<template>
  <div v-if="loading">Chargement...</div>
  <div v-else-if="error">Erreur : {{ error.message }}</div>
  <ul v-else>
    <li v-for="m in methods" :key="m.name">
      {{ m.label }} ({{ m.type }})
    </li>
  </ul>
</template>
```

### 2. Paiement direct avec suivi automatique

```vue
<script setup lang="ts">
import { createElyonPayClient } from "@elyonpay/custom-checkout";
import { useDirectPayment } from "@elyonpay/custom-checkout/vue";

const client = createElyonPayClient({
  token: "votre_jwt_token",
  environment: "sandbox",
});

const { pay, status, transaction, error, reset } = useDirectPayment(client);

function handlePay() {
  pay({
    amount: 15000,
    merchantName: "Ma Boutique",
    merchantId: 258,
    currency: "XAF",
    countryName: "Cameroon",
    beneficiaries: [{ id: 258 }],
    paymentMethod: "ORANGE_MONEY",
    customerMsisdn: "+237690000001",
  });
}
</script>

<template>
  <div>
    <button v-if="status === 'idle'" @click="handlePay">
      Payer 15 000 XAF
    </button>

    <p v-if="status === 'initiating'">Initialisation du paiement...</p>

    <p v-if="status === 'polling'">
      En attente de confirmation...<br />
      Validez le paiement sur votre téléphone.
    </p>

    <div v-if="status === 'success'">
      <p>Paiement réussi !</p>
      <p>Montant : {{ transaction?.amount }} {{ transaction?.currency }}</p>
    </div>

    <div v-if="status === 'error'">
      <p>Le paiement a échoué : {{ error?.message }}</p>
      <button @click="reset">Réessayer</button>
    </div>

    <div v-if="status === 'timeout'">
      <p>Délai d'attente dépassé.</p>
      <button @click="reset">Réessayer</button>
    </div>
  </div>
</template>
```

### Exemple complet Vue

```vue
<script setup lang="ts">
import { ref } from "vue";
import { createElyonPayClient } from "@elyonpay/custom-checkout";
import { usePaymentMethods, useDirectPayment } from "@elyonpay/custom-checkout/vue";
import type { PaymentMethod } from "@elyonpay/custom-checkout";

const client = createElyonPayClient({
  token: "votre_jwt",
  environment: "sandbox",
});

const { methods, loading } = usePaymentMethods(client, "CM");
const { pay, status, transaction, error, reset } = useDirectPayment(client);

const selected = ref<PaymentMethod | null>(null);
const phone = ref("");

function handleSubmit() {
  if (!selected.value) return;
  pay({
    amount: 15000,
    merchantName: "Ma Boutique",
    merchantId: 258,
    currency: "XAF",
    countryName: "Cameroon",
    beneficiaries: [{ id: 258 }],
    paymentMethod: selected.value.name,
    customerMsisdn: phone.value,
  });
}
</script>

<template>
  <div v-if="status === 'success'">
    <p>Paiement confirmé ! Transaction #{{ transaction?.id }}</p>
  </div>

  <div v-else-if="status === 'error' || status === 'timeout'">
    <p>Échec : {{ error?.message }}</p>
    <button @click="reset">Réessayer</button>
  </div>

  <div v-else>
    <h2>Choisissez un moyen de paiement</h2>

    <p v-if="loading">Chargement...</p>
    <ul v-else>
      <li v-for="m in methods" :key="m.name">
        <button
          @click="selected = m"
          :style="{ fontWeight: selected?.name === m.name ? 'bold' : 'normal' }"
        >
          {{ m.label }}
        </button>
      </li>
    </ul>

    <input
      v-if="selected?.type === 'MOBILE_MONEY'"
      type="tel"
      placeholder="+237..."
      v-model="phone"
    />

    <button
      @click="handleSubmit"
      :disabled="!selected || status === 'initiating' || status === 'polling'"
    >
      {{ status === "polling" ? "En attente..." : "Payer 15 000 XAF" }}
    </button>
  </div>
</template>
```

---

## Référence API

### `createElyonPayClient(config)`

Crée une instance du client API.

| Paramètre | Type | Défaut | Description |
| --- | --- | --- | --- |
| `token` | `string` | — | JWT obtenu via `POST /api/login` |
| `environment` | `"sandbox" \| "production"` | `"sandbox"` | Environnement cible |
| `baseUrl` | `string` | — | Override complet de l'URL de base |
| `lang` | `string` | `"fr"` | Langue par défaut |

### `client.getPaymentMethods(countryCode)`

Récupère les méthodes de paiement disponibles. **Endpoint public**, pas besoin d'authentification.

Codes pays supportés : `CM`, `CI`, `GA`, `FR`, `TG`, `BJ`.

### `client.pay(params)`

Initie un paiement direct. Route automatiquement vers l'endpoint Mobile Money ou carte bancaire selon le `paymentMethod`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `amount` | `number` | Montant en devise locale |
| `merchantName` | `string` | Nom du marchand |
| `merchantId` | `number` | ID du marchand |
| `currency` | `string` | Code devise ISO 4217 |
| `countryName` | `string` | Pays du client |
| `beneficiaries` | `Array<{ id: number }>` | Bénéficiaires |
| `paymentMethod` | `string` | Méthode choisie (ex: `"ORANGE_MONEY"`) |
| `customerMsisdn` | `string` | Numéro de téléphone (Mobile Money) |
| `transaction` | `string` | Référence externe (optionnel) |

### `pollTransaction(client, transactionId, options?)`

Poll le statut d'une transaction jusqu'à un état terminal.

| Option | Type | Défaut | Description |
| --- | --- | --- | --- |
| `intervalMs` | `number` | `4000` | Intervalle entre chaque requête |
| `timeoutMs` | `number` | `120000` | Timeout maximum |

### États des transactions

| État | Résultat | Description |
| --- | --- | --- |
| `PENDING` | En cours | Continuez le polling |
| `DELIVERED` | Succès | Paiement confirmé |
| `FAILED` | Échec | Paiement échoué |
| `DECLINED` | Échec | Refusé par l'opérateur |
| `CANCELLED` | Échec | Annulé |

---

## Environnements

| Environnement | URL de base | Description |
| --- | --- | --- |
| Sandbox | `https://api.elyonpay.net/api` | Tests, aucun débit réel |
| Production | `https://api.elyonpay.org/api` | Transactions réelles |

### Numéros de test (Sandbox)

| Numéro | Réseau | Comportement |
| --- | --- | --- |
| `+237600000001` | MTN MoMo | Paiement réussi |
| `+237600000002` | MTN MoMo | Solde insuffisant |
| `+237690000001` | Orange Money | Paiement réussi |
| `+237690000002` | Orange Money | Timeout simulé |
| `+221700000001` | Wave | Paiement réussi |

---

## Sécurité

> **Ne jamais exposer votre token JWT côté client.** Effectuez les appels authentifiés depuis votre serveur backend ou un proxy API sécurisé. Seul l'endpoint `getPaymentMethods` est public et peut être appelé directement depuis le navigateur.

---

## License

MIT

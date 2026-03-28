<script setup lang="ts">
useSeoMeta({
  title: 'FAQ',
  description: 'Často kladené otázky'
})

const items = [
  {
    label: 'Jak se připojím ke kurzu?',
    content: 'Stačí přejít na stránku Kurzy, vybrat kurz a otevřít jeho detail. Pokud je kurz živý, uvidíte obsah v reálném čase.'
  },
  {
    label: 'Potřebuji se registrovat?',
    content: 'Pro prohlížení kurzů registrace není nutná. Pro psaní do feedu a ukládání výsledků kvízů je potřeba se přihlásit.'
  },
  {
    label: 'Jak vytvořím vlastní kurz?',
    content: 'Zaregistrujte se jako lektor, přejděte do Dashboardu a klikněte na "Nový kurz". Přidejte moduly, materiály a kvízy, poté kurz naplánujte nebo spusťte.'
  },
  {
    label: 'Co znamenají stavy kurzů?',
    content: 'Koncept – kurz se připravuje. Naplánováno – kurz má datum zahájení. Živě – kurz právě probíhá. Pozastaveno – lektor kurz dočasně zastavil. Archivováno – kurz byl ukončen.'
  },
  {
    label: 'Jsou kvízy povinné?',
    content: 'Záleží na konkrétním kurzu a lektorovi. Kvízy slouží jako nástroj pro ověření znalostí a jsou nepovinné.'
  },
  {
    label: 'Je platforma zdarma?',
    content: 'Ano, Think different Academy je volně přístupná pro studenty i lektory.'
  }
]
</script>

<template>
  <div>
    <section class="relative py-16 overflow-hidden">
      <div class="gradient-orb gradient-orb-teal w-[350px] h-[350px] -top-20 -left-20" />
      <div class="gradient-orb gradient-orb-blue w-[300px] h-[300px] -bottom-16 -right-16" />

      <UContainer class="relative">
        <div class="max-w-2xl mx-auto fade-in">
          <div class="text-center mb-10">
            <h1 class="text-4xl font-bold mb-2">Často kladené <span class="text-accent">otázky</span></h1>
            <p class="text-muted text-lg">Odpovědi na nejčastější dotazy</p>
          </div>

          <div class="rounded-xl border border-default bg-elevated p-6 card-glow">
            <UAccordion :items="items" />
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>

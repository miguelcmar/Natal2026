# Natal Miguel & Natália

Site de cartas de Natal com reservas anónimas, sem passwords.

- `public/index.html`: página da família. Na primeira vez escolhem quem são; fica guardado nesse browser.
- `public/admin.html`: área para adicionar/editar prendas (abre-se pelo botão "Editar a minha carta" de quem escolheu Miguel ou Natália).
- `functions/api/preview.js`: lê título, imagem e preço de um link de loja (só para Miguel e Natália).

A base de dados (Supabase, projeto `natal-2026`) já está criada e testada.

## 1. GitHub
Cria um repositório e faz upload mantendo as pastas `public/` e `functions/`.

## 2. Cloudflare Pages
Workers & Pages → Create → Pages → Connect to Git → o repositório.
Framework preset: **None** · Build command: **vazio** · Build output directory: **public**.

## Uso
- Família: enviar só o endereço do site. Cada pessoa escolhe o nome na primeira vez.
- Se alguém escolher o nome errado: abrir o endereço com `?reset` no fim (ex.: `https://NOME.pages.dev/?reset`).
- Miguel e Natália: ao escolherem o seu nome aparece "✎ Editar a minha carta".

## Funcionalidades
- Contagem decrescente para o Natal, mensagem de boas-vindas por pessoa, neve e música de Natal opcional (botão no canto, começa desligada).
- Filtro e ordenação por preço; separador "As minhas reservas".
- Confirmação antes de reservar, desfazer, guardar, adicionar ou apagar.
- Fotos das prendas em `public/img/`. A lista da Natália veio do PDF "Carta ao Pai Natal".

## Privacidade
- A base de dados guarda quem reservou (só para "As minhas reservas" e para só essa pessoa poder desfazer); o site nunca o mostra a mais ninguém.
- A base de dados nem envia as reservas da própria lista de quem escolheu "Miguel" ou "Natália".
- É um sistema de confiança: quem escolher o nome de outra pessoa vê o que essa pessoa veria.
- Quem escolher "Miguel" ou "Natália" também pode editar essa carta (sem passwords, é um sistema de confiança).

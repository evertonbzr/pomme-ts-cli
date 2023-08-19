# pomme-ts-cli


**pomme-ts-cli** é uma ferramenta de linha de comando (CLI) para gerar uma SDK para projetos que utilizam a biblioteca *pomme-ts*. Essa SDK permite fazer chamadas a uma API REST de forma simplificada, facilitando a interação com o serviço oferecido pela biblioteca *pomme-ts*.

## Funcionalidades

- Gere rapidamente uma SDK personalizada para seu projeto que utiliza a biblioteca *pomme-ts*.
- Simplifique as chamadas à API REST do seu serviço *pomme-ts* com uma interface de linha de comando amigável.

## Instalação

Instale o **pomme-ts-cli**:

```bash
npm install pomme-ts-cli
# or
yarn add pomme-ts-cli
```

## Como usar?

Para usar o **pomme-ts-cli**, você precisa de um servirdor NodeJS rodando com o **pomme-ts** e com o generateRoutesOutput ativado, em seguida rode o comando:

```bash
npx pomme generate
# or
npx pomme generate --baseUrl="<baseUrl>"
```
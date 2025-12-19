# ⚽ Sport.Ai

> Plataforma SaaS moderna para gestão inteligente de quadras e complexos esportivos.

![Badge em Desenvolvimento](http://img.shields.io/static/v1?label=STATUS&message=EM%20DESENVOLVIMENTO&color=GREEN&style=for-the-badge)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)

## 💻 Sobre o Projeto

O **Sport.Ai** é uma solução B2B/B2C desenvolvida para resolver a dor de cabeça no agendamento de quadras esportivas. O sistema elimina o uso de planilhas e conversas demoradas no WhatsApp, oferecendo:

1.  **Para o Dono (Admin):** Um painel de controle completo para gerenciar horários e visualizar a ocupação.
2.  **Para o Jogador (Cliente Final):** Um link público e rápido para verificar disponibilidade e realizar agendamentos.

## 🎨 Layout

<div align="center">
	<img src="https://via.placeholder.com/800x400?text=Print+do+Dashboard+Admin" alt="Dashboard Admin" width="700">
</div>

## 🛠 Tecnologias Utilizadas

O projeto foi construído com foco em **performance** e **DX (Developer Experience)**, utilizando o que há de mais moderno no ecossistema JavaScript:

- **[React 19](https://react.dev/):** Biblioteca principal para construção da interface.
- **[Vite](https://vitejs.dev/):** Build tool de próxima geração (extremamente rápido).
- **[Bun](https://bun.sh/):** Runtime e gerenciador de pacotes (substituindo o Node.js para maior velocidade).
- **[TypeScript](https://www.typescriptlang.org/):** Tipagem estática para maior segurança e escalabilidade.
- **[Tailwind CSS](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/):** Para estilização moderna, responsiva e acessível.
- **React Router DOM:** Gerenciamento de rotas e navegação SPA.
- **React Helmet Async:** Otimização de SEO e metadados.

## 🚀 Como Rodar o Projeto

### Pré-requisitos

Você precisa ter o **[Bun](https://bun.sh/)** instalado em sua máquina.

### Instalação

```bash
# Clone este repositório
$ git clone https://github.com/RafalauriSantos/campo-verde-agil.git

# Acesse a pasta do projeto no terminal/cmd
$ cd campo-verde-agil

# Instale as dependências (Ultra rápido com Bun ⚡)
$ bun install

# Execute a aplicação em modo de desenvolvimento
$ bun dev
```

A aplicação será aberta na porta: http://localhost:5173

## ⚙️ Funcionalidades Atuais (MVP)

- [x] Login Administrativo: Acesso seguro para proprietários.
- [x] Dashboard: Visão geral do sistema.
- [x] Agenda Pública: Link compartilhável (/agendar) para jogadores visualizarem horários.
- [x] Roteamento Inteligente: Redirecionamentos automáticos baseados no perfil de acesso.
- [x] SEO Otimizado: Metatags dinâmicas para compartilhamento em redes sociais.

## 🔜 Próximos Passos (Roadmap)

- [ ] Integração com Gateway de Pagamento.
- [ ] Notificações via WhatsApp para confirmação de jogos.
- [ ] Implementação de IA (Python) para análise preditiva de horários de pico.

## 📝 Licença

Este projeto está sob a licença MIT.

Desenvolvido por Rafael Lauri 🚀

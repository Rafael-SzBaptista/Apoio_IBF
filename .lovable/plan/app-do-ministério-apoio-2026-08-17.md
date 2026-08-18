# App do Ministério Apoio

Substituir as planilhas do Apoio 2026 por um app web (instalável depois como PWA) com login, escalas, almoxarifado, cardápio/precificação e financeiro.

## Acesso e membros

- Login por e-mail e senha. Só e-mails previamente cadastrados por um administrador conseguem concluir o cadastro.
- Dois níveis: administrador (tudo) e membro (visualiza escalas, cardápio, almoxarifado; marca tarefas e registra gastos das programações em que serve).
- Tela de equipe: convidar por e-mail, definir função (decoração/alimentação), promover a admin, desativar.

## Módulos

### 1. Programações
Criar/editar programação com: nome do evento (Culto Conecte, Noite de jogos, Acampa...), data, horário, local + link do Maps, quantidade esperada de pessoas, comida do cardápio, telefones de contato, observações.
- Responsáveis por área (decoração e alimentação), como na planilha de escala.
- Checklist de tarefas (to-do) por programação, com responsável e status.
- Lista de compras gerada automaticamente: quantidade por pessoa do cardápio x pessoas esperadas, com custo estimado.
- Itens do almoxarifado reservados para o evento.

### 2. Calendário
Visão mensal com as programações do mês, cor por tipo de evento, e quem está escalado. Clicar abre a programação. Filtro "minhas escalas".

### 3. Almoxarifado
Itens agrupados por setor (Papelaria, Iluminação, Vasos e plantas, Artigos de esporte, etc.), com quantidade, foto, observação e local de guarda. Criar, editar, excluir, buscar e filtrar. Histórico simples de entrada/saída.

### 4. Cardápio
Cada alimentação (Cachorro quente, Strogonoff de frango, Lanche natural, Pizza, Coffee break, Bebidas, Pipoca + chocolate quente...) com:
- Ingredientes, quantidade por pessoa, onde comprar, observações.
- Modo de preparo.
- Preços por ingrediente (quantidade, unidade, preço) e cálculo automático do custo por pessoa e do custo total para X pessoas, incluindo taxa de segurança.

### 5. Financeiro
- Registro por programação: gastos, receita e lucro; saldo do evento.
- Balanço mensal e total do ano (equivalente à aba Caixa Conecte), com gráfico.
- Notas fiscais: upload de foto/PDF por gasto, com status de reembolso (pendente / solicitado / reembolsado) e valor, já que toda compra é ressarcida pela Igreja via CNPJ.

## Dados iniciais importados da planilha

- Inventário completo por setor com quantidades.
- Cardápio e precificação (receitas, ingredientes por pessoa, onde comprar, preços).
- Escalas 2026 (1º e 2º semestre) como programações com data, local, horário, comida e responsáveis.
- Membros que aparecem nas escalas (Beatriz, Rafael B, Nicholas, Carla, Isabela L, Isabela S, Rafael...), como perfis a serem convidados.

A aba "Oficina Conecte" será ignorada.

## Design

Interface em português, pensada para celular primeiro (uso na correria do evento), com navegação inferior: Início, Calendário, Almoxarifado, Cardápio, Financeiro. Painel inicial mostra a próxima programação, escala da semana e saldo do mês. Identidade jovem e limpa, sem visual genérico.

## Detalhes técnicos

- Lovable Cloud para banco, autenticação e armazenamento de imagens (fotos de itens e notas fiscais).
- Tabelas: `profiles`, `user_roles` (tabela separada, com função `has_role`), `inventory_sectors`, `inventory_items`, `inventory_movements`, `events`, `event_assignments`, `event_tasks`, `menus`, `menu_ingredients`, `ingredients` (preço/unidade/onde comprar), `finance_entries`, `receipts`.
- RLS em todas as tabelas: leitura para autenticados, escrita restrita a admin (exceto tarefas e lançamentos do próprio evento).
- Buckets de storage privados para fotos do almoxarifado e notas fiscais.
- Dados iniciais inseridos por migração SQL a partir da planilha.
- Manifest PWA para instalar no celular.

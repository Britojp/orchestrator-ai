INSERT INTO tasks (title, description, acceptance_criteria, priority)
VALUES (
  'Tela de Gestão de Usuários com filtros avançados e ações em lote',
  'Implementar uma tela administrativa completa para gestão de usuários. A tela deve conter: (1) cabeçalho com título, descrição e ações primárias; (2) área de filtros com busca por nome/email, filtro por status (ativo/inativo/pendente), filtro por perfil (admin/editor/viewer), filtro por período de criação e botão de limpar filtros; (3) tabela de dados com colunas Nome, Email, Perfil, Status, Último acesso, Data de criação e Ações; (4) paginação server-side com seletor de tamanho de página; (5) seleção de múltiplas linhas com checkbox e barra de ações em lote (ativar, desativar, remover); (6) drawer lateral de detalhes do usuário ao clicar em uma linha, exibindo dados principais e histórico recente; (7) estados de loading (skeleton), vazio (empty state com call to action) e erro (mensagem + botão de tentar novamente). A implementação deve seguir os padrões visuais e componentes já existentes no projeto alvo, preservando consistência de layout, tipografia, espaçamento e responsividade.',
  '- Existe rota/página funcional para gestão de usuários acessível no menu administrativo
- A tela renderiza cabeçalho, bloco de filtros, tabela, paginação e ações em lote
- Filtros combinados atualizam a listagem corretamente e possuem opção de limpar
- Busca por texto funciona por nome e email com debounce para evitar excesso de requisições
- Paginação permite navegar entre páginas e alterar quantidade de itens por página
- Seleção múltipla habilita ações em lote e exibe feedback de sucesso/erro por ação
- Clique em linha abre drawer/modal de detalhes com informações consistentes do usuário
- Estados de loading, vazio e erro estão implementados e sem quebrar o layout
- Interface é responsiva (desktop e tablet) e mantém usabilidade mínima em mobile
- Acessibilidade básica: labels em campos, foco visível, navegação por teclado nas ações principais
- Código organizado em componentes menores quando necessário, seguindo padrão do projeto
- Testes (quando já houver stack de testes no projeto) cobrem pelo menos renderização principal e fluxo de filtros',
  10
);

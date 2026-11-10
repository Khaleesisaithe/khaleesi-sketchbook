# Plano de implementação — Sketchbook de Tattoo de Khaleesi Saithe

## Direção do produto

Criar um portfólio público e uma área administrativa para uma tatuadora, apresentado como um sketchbook físico: editorial, autoral, gótico e com o carmim, o papel claro, o preto e a tipografia do manual de cuidados enviado. O manual orienta a linguagem visual, mas a instrução atual é não gerar nem criar imagens: usar somente tipografia, textura e linhas/rabiscos em CSS. O site ficará sem fotografias até a artista fornecer imagens reais. Sem fotos, preços, flashes, horários, biografia, links sociais e contatos fornecidos, o catálogo terá estados vazios e placeholders nomeados.

O PDF de oito páginas será transcrito integralmente na seção **Cuidados**, mantendo as divisões antes, durante e após a sessão e todo o conteúdo sobre higiene, descanso, alimentação, hidratação, desconforto, cicatrização e retoque. O texto do manual não será complementado com recomendações clínicas inventadas.

## Arquitetura

A base existente é React 19, TypeScript, Vite, Tailwind CSS 4, Wouter, Express, tRPC e Drizzle. Ela será mantida para a aplicação e o servidor. A persistência da aplicação usará Supabase PostgreSQL, Supabase Auth e Supabase Storage para atender ao requisito explícito de RLS. A base MySQL Manus provisionada na inicialização não será usada pela aplicação; foi ativada e não é desativável no projeto atual. Não será adicionado Redis.

Supabase Auth protegerá o acesso administrativo por email e senha, com fluxo de recuperação de senha que não revela se um email está cadastrado e só permite trocar a senha após uma sessão de recuperação válida. O formulário de recuperação envia a origem aberta no navegador junto à rota `/atelier-7e4c19b2?recovery=1`; essa URL também precisa estar permitida em **Authentication > URL Configuration > Redirect URLs** no Supabase. Os dados administrativos serão protegidos no servidor e por políticas RLS no banco, com tabelas de papéis que clientes não podem editar. O navegador usará somente URL e chave pública anon/publishable; chaves privilegiadas permanecerão no servidor. O email verificado precisa continuar na allowlist `ADMIN_ALLOWED_EMAIL` em cada autorização, sem bootstrap aberto ao primeiro visitante.

Os pedidos públicos de horário registrarão somente estado `pending`. A hora solicitada permanecerá indisponível enquanto estiver pendente ou aprovada e será liberada quando recusada, cancelada ou reagendada. Uma restrição de exclusão no PostgreSQL impede sobreposição entre pedidos ativos; triggers transacionais, serializados por trava consultiva, também impedem conflitos entre esses pedidos e bloqueios manuais. As decisões administrativas comparam status e `updated_at` antes de atualizar, evitando sobrescritas concorrentes e emails contraditórios. O cliente nunca terá acesso à lista de outros pedidos nem a dados pessoais; o calendário público exporá somente disponibilidade. As alterações administrativas de status exigirão autenticação, autorização no servidor e RLS.

O servidor validará dados com schemas Zod, aplicará limites de tamanho e proteção contra abuso nos formulários públicos. O painel usará tokens Bearer (sem autenticação por cookie), reduzindo a superfície de CSRF; a API aceita somente JSON e não habilita CORS para origens arbitrárias. Os limites combinarão contadores pseudonimizados por email e tetos globais serializados no banco; não se confiará em cabeçalhos de IP encaminhados sem um contrato confiável do proxy. A saída será escapada pelo React; URLs externas serão validadas. Imagens de catálogo ficarão em bucket público apenas após moderação da artista. Referências de clientes serão texto ou links, sem upload de fotos neste escopo. Fotos reais do portfólio poderão ser enviadas pela administradora a um bucket público, após autenticação, autorização e validação server-side de tamanho e assinatura/formato.

Resend será o adaptador de email transacional para a notificação da artista e a resposta automática ao cliente. O envio só será considerado operacional quando a chave API, endereço remetente e domínio verificado estiverem configurados. Esses valores serão pedidos somente por entrada protegida, nunca no chat. Os resultados ficarão visíveis no histórico protegido do painel; falhas não são reenviadas automaticamente, e o sistema nunca tratará notificações da plataforma Manus como email ao cliente.

A privacidade incluirá consentimento explícito, aviso LGPD, canal de solicitação de acesso/exclusão e processo administrativo para executar a exclusão dos registros pessoais. Não serão prometidos prazos de retenção não definidos pela artista; a configuração e o aviso serão identificados para preenchimento antes do lançamento público. A política informará hospedagem Manus, serviços Supabase/Resend, Google Fonts e eventuais incorporações externas de Instagram/Pinterest.

## Design

- **Movimento:** editorial neo-gótico de sketchbook e gravura em tinta, guiado pelo manual enviado.
- **Princípios:** textura de papel sem prejudicar legibilidade; hierarquia serifada de cartaz; carmim como acento expressivo; composição assimétrica de páginas anotadas.
- **Paleta:** vermelho carmim extraído visualmente do manual, preto de tinta, cinza de seção e marfim de papel; tons de tinta e papel são os fundos principais.
- **Layout:** páginas/folhas com margens, numeração, fitas editoriais e composição orgânica. Navegação em rotas distintas para portfólio, catálogo, cuidados, agendamento e painel.
- **Elementos de assinatura:** molduras finas de desenho técnico, linhas e rabiscos tipográficos construídos em CSS e carmim como marca de edição; nenhum desenho-foto ou outro asset visual será gerado/criado agora. Espaços de mídia ficam reservados para fotografias reais que a artista fornecer depois.
- **Interações e movimento:** transições breves de página e linhas/rabiscos construídos em CSS, sem parallax que prejudique leitura; suporte a `prefers-reduced-motion`, sem movimento essencial para compreender ou usar o site.
- **Tipografia:** Cinzel para títulos e marcas; Lora para texto corrido e leitura do manual; hierarquia responsiva com corpo confortável e foco visível.
- **Essência da marca:** sketchbook digital autoral para conhecer e agendar tatuagens com Khaleesi Saithe; três traços: artística, íntima e cuidadosa.
- **Voz:** direta, calorosa e autoral. A copy das páginas, chamadas e estados vazios segue os princípios de Humanizer: linguagem natural, frases claras e afirmações apoiadas pelo que o site realmente faz. A revisão não altera o manual de cuidados, a política de privacidade nem os avisos de segurança. Exemplos: “Veja os trabalhos publicados e conte sua ideia.” / “O pedido só vira um horário confirmado depois da aprovação da artista.”
- **Marca:** logotipo tipográfico “Khaleesi Saithe” inspirado no cabeçalho do manual, acompanhado apenas por linhas e ornamentos CSS; não será criado símbolo em imagem.
- **Cor de assinatura:** carmim do manual.

## Rotas e estrutura de código

O manifesto `client/public/manus-routes.json` acompanhará as rotas de interface: `/`, `/portfolio`, `/flashes`, `/artes`, `/inspiracoes`, `/cuidados`, `/agendar`, `/privacidade` e `/atelier-7e4c19b2`. A rota de sistema `/404` permanece excluída do manifesto por ser apenas destino de não encontrado.

- `client/src/pages/`: páginas Home, Portfolio, Flashes, Artes, Inspirações, Cuidados, Agendar, Privacidade e Administração.
- `client/src/components/`: navegação, layout de folha, motivos de sketchbook, galeria/modal acessível, formulário, calendário, feedback e campos reutilizáveis.
- `client/src/lib/`: cliente Supabase público, consultas, validação e utilitários de imagem.
- `server/routers/` ou módulos em `server/`: operações públicas e administrativas, validações, agenda, catálogo, uploads e email.
- `supabase/migrations/`: tabelas, índices, grants, funções auxiliares e políticas RLS; `supabase/tests/`: testes de permissão por papel/ação.
- `shared/`: tipos e schemas compartilhados somente quando adequados a cliente e servidor.

A configuração de provedor ficará fora do Git em variáveis de ambiente. O `.env.example` conterá apenas nomes e instruções, sem valores. O código não usará chaves privadas do Supabase ou Resend no bundle do navegador.

## Limites e preparação para operação

A artista informou que executou com sucesso a migration principal `supabase/migrations/20261104000000_create_sketchbook.sql`; o projeto tem credenciais Supabase configuradas, sem expor seus valores. A aplicação da migration social `supabase/migrations/20261106010000_extend_social_profile.sql` ainda não foi confirmada; os novos campos não devem ser considerados operacionais até essa etapa. O acesso ao painel ainda depende de uma conta Supabase Auth verificada para o email autorizado. Antes do lançamento, também é preciso confirmar o envio Resend, o remetente verificado, o perfil e os horários da artista. Até isso acontecer, a interface informa o que está pendente e não promete confirmação automática.

As migrações são aditivas; nenhum dado da base MySQL provisionada será alterado. Os testes de RLS revertem suas alterações e devem rodar somente no projeto Supabase de desenvolvimento. Não farei testes que escrevam em uma base de produção sem confirmar primeiro o ambiente. Ainda não há destino externo de backup configurado; o README explica como preparar uma cópia e testar a recuperação, sem afirmar que existe backup automático.

## Referências técnicas consultadas

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Storage Access Control: https://supabase.com/docs/guides/storage/security/access-control
- Resend Node.js: https://resend.com/docs/send-with-nodejs
- Humanizer v3.1.0, licença MIT: https://github.com/blader/humanizer


## Extensão do escopo aprovada pela artista (2026-11-06)

### Identidade visual e navegação

A prancha do alfabeto e seu QR continuam servindo apenas de referência tipográfica, sem serem reutilizados como imagem. A artista aprovou especificamente o WebP e o MP4 enviados em 2026-11-07 como artes de fundo; são os únicos assets de imagem/vídeo adicionados, sem gerar novas artes. A interface pública mantém o preto/cinza com vinho escuro como acento, texto legível e animações breves de ícones/cliques e virada de página, respeitando `prefers-reduced-motion`. O painel administrativo terá tipografia de interface diferente, maior legibilidade e estrutura profissional própria, sem herdar a navegação editorial pública.

A rota administrativa é `/atelier-7e4c19b2`. Ela não tem link na navegação ou rodapé públicos, tem `noindex` e continua protegida por Supabase Auth e allowlist; a URL não é senha e o manifesto técnico obrigatório de rotas ainda pode revelá-la. O arquivo existente `links-de-acesso-da-artista.txt` contém o link do Preview público e o acesso da artista, informando que o domínio ainda não foi comprado e o site não está publicado. A confirmação da senha continuará sendo requisito para qualquer dado administrativo.

### Redes e conteúdo público

O perfil armazenará, além dos campos existentes, links de YouTube e de um portfólio externo. A Home apresentará a biografia, o @ do Instagram extraído do link real e ícones acessíveis para Instagram, YouTube e portfólio somente quando a artista fornecer URLs válidas; o WhatsApp seguirá condicional. O espaço Sobre a artista aceitará a apresentação completa que a artista enviará, sem texto biográfico fictício.

Posts do Instagram serão apresentados como incorporações públicas oficiais, carregadas somente após um clique do visitante. A lista curada de URLs públicas e a seleção de um post em destaque serão administradas no painel; isso não raspa o perfil nem promete sincronização automática de todos os posts. A sincronização automática via API da Meta é uma etapa separada, condicionada a conta Instagram profissional, app/token Meta e autorização da artista. A página Pinterest usará o board público informado pela artista e o widget oficial, também carregado sob ação do visitante. Endereços e nomes de conta reais ainda não foram fornecidos.

### Fundo artístico sincronizado à rolagem

O arquivo `/manus-storage/khaleesi-scroll-poster_0e2d640e.webp` é o primeiro quadro exibido na abertura. O vídeo `/manus-storage/khaleesi-scroll-scrub_e1623447.mp4` contém o WebP por 0,45 s antes dos 7,93 s de movimento original, em 24 fps, 720 × 1280, sem áudio e otimizado para aproximadamente 1,8 MB. Sua sequência contínua de zoom para o centro com leve rotação anti-horária é adequada para scrub. O progresso vertical da página controla a posição do vídeo, avançando ao rolar para baixo e retrocedendo ao rolar para cima; o vídeo fica pausado e não há autoplay.

O fundo é `position: fixed` e preenche o viewport inteiro por trás de todas as páginas públicas; não é um bloco no Hero, no cabeçalho ou no rodapé, e não aparece no painel administrativo. A imagem e cada quadro do vídeo são exibidos em `cover`, a 100% de opacidade, sem blur, véu ou camada translúcida; a proporção é preservada e o recorte responsivo ocupa a tela sem barras vazias. O conteúdo existente não é alterado. Com `prefers-reduced-motion`, o vídeo não é carregado nem scrubbado e a imagem WebP permanece estática em tela cheia.

A migration incremental `supabase/migrations/20261106010000_extend_social_profile.sql` adiciona ao perfil os campos `youtube_url`, `external_portfolio_url`, `instagram_post_urls` e `instagram_featured_post_url`, com restrições de URL, quantidade e destaque. Ela não cria uma tabela separada de posts nem novas políticas RLS. A artista ainda precisa confirmar a aplicação no projeto Supabase correto; não farei alterações diretas no banco compartilhado. A página e o painel podem ser concluídos antes de chegarem os links sociais, exibindo estados vazios claros.

### Estrutura de implementação adicional

`client/src/lib/privateRoute.ts` centraliza a rota não comum; `client/src/App.tsx` aplica as transições da experiência pública e monta `client/src/components/ScrollScrubBackground.tsx` somente fora da rota administrativa. `client/src/components/SiteLayout.tsx` continua fornecendo o layout público; o painel usa sua estrutura e tipografia próprias em `client/src/pages/Admin.tsx`. A página de inspirações aciona os scripts oficiais apenas após consentimento. A migration social e os testes RLS ficam em `supabase/migrations/` e `supabase/tests/`.

### Limites documentados das plataformas

A documentação da Meta declara que o Instagram Platform acessa contas profissionais Business/Creator; acesso padrão é suficiente para contas próprias ou gerenciadas, enquanto conta profissional de terceiros exige Advanced Access/App Review. O endpoint oEmbed só incorpora conteúdo público compatível; posts em contas privadas/inativas/restritas ou com embeds desativados não funcionam. Por isso, o primeiro fluxo usa URLs de posts públicos fornecidas pela artista e incorporação oficial, não scraping. Referências: https://developers.facebook.com/documentation/instagram-platform/overview, https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media e https://developers.facebook.com/documentation/instagram-platform/oembed.

O Pinterest orienta gerar o add-on Board no widget builder oficial usando a URL do board e inserir o código fornecido na página. O embed será opt-in para que scripts e conexões externos não carreguem antes da escolha do visitante. Referência: https://help.pinterest.com/en/business/article/build-a-website-widget.


## Publicação piloto na Vercel (2026-11-10)

O repositório canônico confirmado é `KhaleesiSaithe/khaleesi-sketchbook`. A entrega desta etapa deve incluir um commit na branch `main` com a mensagem literal `Versão piloto` e uma publicação pública na Vercel, conforme autorização da artista. A URL definitiva será a fornecida pela Vercel; não inventar domínio.

A interface continuará sendo a SPA React/TypeScript/Vite. O build Vercel produzirá os arquivos estáticos em `public/`, servidos pelo CDN da Vercel; `404.html` será gerada a partir do shell da aplicação para manter o status de não encontrado. As páginas declaradas em `client/public/manus-routes.json` serão reescritas para `/index.html`, sem interceptar `/api/*`. Um entrypoint Express `server.ts` na raiz exportará a aplicação como função serverless, e o registro de middleware/rotas será compartilhado com o servidor local `server/_core/index.ts`, que continuará iniciando normalmente no Preview Manus. O runtime Vercel não chamará `listen()` nem dependerá de `express.static()`; arquivos persistentes e upload de imagens continuam em Supabase Storage.

Os assets enviados pela artista (WebP e MP4) serão copiados do Storage atual para `client/public/images/` e referenciados por URLs relativas da origem, pois `/manus-storage/` não existe no domínio Vercel. O MP4 permanece pausado e controlado pela rolagem; nenhum asset novo será gerado.

`vercel.json` declarará o comando de build, rewrites específicos da SPA e cabeçalhos de segurança. A rota `/atelier-7e4c19b2` manterá `X-Robots-Tag: noindex, nofollow, noarchive`; a proteção efetiva continuará sendo Supabase Auth, verificação de função no servidor e RLS. Não configurar `X-Frame-Options` nem `frame-ancestors 'self'`, para não quebrar o Preview incorporado. `/api/site-config.js` e `/api/platform/config.js` serão atendidos em runtime pelo Express com `Cache-Control: no-store`, não servidos como arquivos estáticos de build. A resposta pública conterá somente Supabase URL/anon key; `SUPABASE_SERVICE_ROLE_KEY` nunca será incorporada ao cliente.

A produção usa Supabase PostgreSQL, Auth e Storage já existentes; não usa nem modifica o banco MySQL provisionado pela Manus. A Vercel Functions não oferece filesystem persistente nem memória compartilhada entre instâncias, então os agendamentos, imagens e dados administrativos continuam no Supabase. Chaves do Supabase e email administrativo só serão enviados ao ambiente de produção Vercel após confirmação explícita da artista. As credenciais Resend não estão configuradas nesta sessão; notificações por email ficam pendentes até que sejam adicionadas com autorização. É necessário confirmar no Supabase de destino a migration base, a migração de perfil social e a constraint semanal antes de ativar as funções administrativas, gravar campos sociais ou cadastrar horários reais.

Estrutura relevante: `client/` contém a SPA, CSS, manifesto de rotas e assets; `server/_core/app.ts` centralizará middleware e rotas reutilizáveis; `server/_core/index.ts` mantém o processo de desenvolvimento/Preview; `server.ts` é a exportação Express do Vercel; `scripts/prepare-vercel-assets.mjs` monta o diretório público após o build; `vercel.json` define serving, rewrites e cabeçalhos; `supabase/` mantém migrations e testes; `README.md` documentará ambiente e callback de recuperação; `links-de-acesso-da-artista.txt` receberá a URL real somente depois da publicação confirmada.

Referências oficiais usadas: [Express na Vercel](https://vercel.com/docs/frameworks/backend/express), que requer uma aplicação Express exportada por padrão e serve arquivos de `public/**` pelo CDN, ignorando `express.static()`; [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite), que documenta build de SPA e rewrite para `/index.html`; e [rewrites do Vercel](https://vercel.com/docs/routing/rewrites), cujas regras preservam o URL visível ao visitante.


Para atender ao limite de corpo HTTP das Vercel Functions sem depender de streaming de upload, o painel aceita imagens JPEG/PNG/WebP de até 4 MB. O servidor verifica MIME real e autorização antes do upload, e grava o objeto no bucket Supabase; nenhum arquivo de upload depende do filesystem efêmero da Function.

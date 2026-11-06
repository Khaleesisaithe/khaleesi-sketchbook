# Khaleesi Saithe — Sketchbook de Tattoo

Portfólio digital e painel de administração em React, TypeScript, Tailwind, Express, tRPC e Supabase. A direção visual atual é CSS-only: tipografia, papel e linhas/rabiscos em CSS, sem fotografias ou ilustrações novas. Fotografias reais só devem ser adicionadas quando fornecidas pela artista.

## Estado operacional

O código da aplicação, a migration base Supabase e os testes de políticas estão no projeto. A artista informou que aplicou `supabase/migrations/20261104000000_create_sketchbook.sql` ao Supabase usado para desenvolvimento; isso não foi verificado diretamente nesta sessão. A migration social `supabase/migrations/20261106010000_extend_social_profile.sql` ainda precisa ser confirmada/aplicada. A base MySQL Manus habilitada durante a inicialização não é usada nem modificada por esta aplicação. O painel exige uma conta Supabase Auth verificada e autorizada; antes de abrir o site ao público, confirme também o Resend, o remetente verificado, o perfil e os horários da artista.

## Requisitos e desenvolvimento

- Node.js compatível com o lockfile e pnpm 10.18.0.
- `pnpm install --frozen-lockfile`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `pnpm dev` inicia Express/Vite em `PORT` (3000 por padrão).

O servidor fornece `/api/health` e, em runtime, apenas valores públicos em `/api/site-config.js`; chaves privilegiadas nunca devem entrar no bundle do navegador. O manifesto de rotas está em `client/public/manus-routes.json`.

## Configuração Supabase

1. Crie um projeto Supabase separado para desenvolvimento/testes e outro para produção; não aplique migrations de teste em um banco de produção.
2. No projeto de desenvolvimento, execute `supabase/migrations/20261104000000_create_sketchbook.sql` pelo SQL Editor ou ferramenta de migrations. Confirme que concluiu sem erro antes de criar usuários ou enviar dados reais.
3. Execute `supabase/migrations/20261106020000_guard_weekly_hours_overlap.sql`. Ela adiciona uma constraint GiST que impede intervalos semanais habilitados que se sobreponham, inclusive em gravações concorrentes. Se o preflight apontar sobreposição já existente, revise os horários manualmente; a migration não apaga nem altera linhas.
4. Para os novos campos sociais, execute também `supabase/migrations/20261106010000_extend_social_profile.sql` antes de salvá-los no painel.
5. Crie um usuário administrativo verificado em Supabase Auth. O email precisa corresponder a `ADMIN_ALLOWED_EMAIL`; o servidor registra esse usuário na tabela `admin_users` após validar o token e o email. Não habilite cadastro aberto para visitantes.
6. Configure as chaves pelo mecanismo protegido de Secrets do projeto: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `ADMIN_ALLOWED_EMAIL`. A URL e a chave publicável anon podem ser visíveis ao navegador, mas a service-role é privada e só existe no servidor.
7. Configure as URLs autorizadas de retorno de Auth para o domínio de Preview e o domínio publicado. Nunca use uma chave service-role no browser.

Para revogar acesso, remova a conta correspondente de `public.admin_users` no projeto Supabase. Alterar `ADMIN_ALLOWED_EMAIL` bloqueia as rotas do servidor para o email antigo, mas não apaga por si só a linha que as políticas RLS consultam.

Se uma execução anterior da migration parou com erro de policy já existente, use sempre o arquivo atualizado completo e rode-o novamente; não apague tabelas nem dados manualmente. O script remove e recria apenas as policies com os nomes definidos por esta aplicação e usa operações idempotentes para estruturas já existentes.

Links oficiais: [criar projeto](https://supabase.com/dashboard/projects), [regiões](https://supabase.com/docs/guides/platform/regions), [chaves API](https://supabase.com/docs/guides/getting-started/api-keys) e [migrations de banco](https://supabase.com/docs/guides/deployment/database-migrations). Para usuários no Brasil, a região específica disponível é São Paulo (`sa-east-1`); a região afeta a localização primária dos dados e pode não ser alterável depois sem migração para outro projeto.

Os testes de RLS em `supabase/tests/rls.sql` são transacionais e revertem seus dados. Execute-os apenas no banco separado de desenvolvimento. Eles não aplicam a migration automaticamente.

## Email transacional

Configure uma conta Resend e verifique um domínio remetente. Guarde `RESEND_API_KEY`, `RESEND_FROM` e `BOOKING_NOTIFICATION_EMAIL` no mecanismo protegido de Secrets. `RESEND_FROM` deve usar um domínio autenticado no provedor. O sistema registra o resultado de envio; o formulário nunca trata o pedido como confirmado antes de uma decisão administrativa.

## Primeira configuração no painel

Depois de autenticar, preencha primeiro nome, fuso IANA, duração dos atendimentos, horários semanais e contato. Publique o perfil somente quando as informações estiverem corretas. Em seguida, adicione fotos reais ao portfólio e catálogo, configure preços/status, links de Instagram/Pinterest e teste uma solicitação controlada em desenvolvimento. O pedido permanece pendente até aprovação ou recusa manual.

Para habilitar YouTube, portfólio externo e posts destacados do Instagram, aplique `supabase/migrations/20261106010000_extend_social_profile.sql` no projeto Supabase antes de salvar esses campos. Cadastre apenas URLs reais fornecidas pela artista. Os widgets oficiais de Instagram e Pinterest não carregam até a pessoa visitante escolher carregá-los.

A política de privacidade contém campos que dependem da artista: identificação da responsável, canal de contato, prazos de retenção e condições dos fornecedores. Complete e revise esses dados antes da publicação pública. Um pedido de exclusão exige verificação da identidade por canal independente; o botão do painel pede uma confirmação deliberada, mas não comprova a identidade por si só.

## Backups e recuperação

Não há backup externo configurado por este repositório. Defina backups automáticos no plano/serviço Supabase escolhido e mantenha, se necessário, uma exportação independente e criptografada do PostgreSQL e uma cópia dos objetos do bucket `portfolio-images`. Armazene cópias fora do projeto e teste uma restauração em um projeto de desenvolvimento. Documente o período de retenção, as pessoas com acesso e o prazo para apagar cópias; backups podem conter dados pessoais excluídos da aplicação até expirarem.

## Segurança e limites

A autenticação do painel usa Supabase Auth com Bearer token; não há cookie de sessão do aplicativo. As mutations administrativas verificam a sessão no servidor e as tabelas/Storage também têm RLS. Pedidos públicos são submetidos por RPCs com validação no servidor/PostgreSQL, consentimento, honeypot, limites por email e limites globais. Isso reduz abuso, mas não substitui um serviço especializado de mitigação de DDoS nem uma avaliação jurídica da política LGPD.

A rota administrativa envia `X-Robots-Tag: noindex, nofollow, noarchive` na resposta HTTP. O `robots.txt` não bloqueia essa rota, para que robôs compatíveis possam ler a diretiva; a proteção real do painel continua sendo a autenticação e autorização.

O email precisa permanecer em `ADMIN_ALLOWED_EMAIL` em toda autorização; a variável também controla o provisionamento da tabela de papéis. No PostgreSQL, triggers serializados recusam sobreposição entre pedidos ativos e bloqueios manuais, e os contadores globais de formulários também usam travas transacionais. A artista informou que aplicou a migration base ao projeto de desenvolvimento, mas a sessão não verificou o banco; considere essas regras ativas apenas depois de confirmar a aplicação no projeto correto. Aplique e confirme a migration base no projeto de produção antes de publicar.

As fotos do portfólio ficam públicas quando publicadas. Não envie documentos pessoais nem fotos de clientes como referência neste fluxo; o formulário aceita apenas texto/link HTTPS para referências. A ferramenta de exclusão remove pedidos e solicitações associadas ao email e anonimiza o pedido LGPD que originou a ação; não elimina automaticamente dados que fornecedores externos conservem em backups próprios.

## Arquivos relevantes

- `client/src/content/careGuide.ts`: transcrição comparada com o PDF enviado; dois erros de digitação da transcrição foram corrigidos, sem adicionar recomendações ao conteúdo.
- `supabase/migrations/20261104000000_create_sketchbook.sql`: schema, RLS, Storage e funções RPC.
- `supabase/tests/rls.sql`: verificações de negação para sessões anon e autenticadas sem papel.
- `server/_core/email.ts`: notificações Resend.
- `server/uploads.ts`: validação server-side e upload protegido.
- `plan.md` e `TODO.md`: decisões aprovadas e requisitos da solicitação.

## Revisão editorial

A copy pública de apresentação, navegação e estados vazios segue princípios da skill [Humanizer](https://github.com/blader/humanizer), distribuída sob licença MIT. A revisão busca clareza e voz natural; não acrescenta fatos nem altera o manual enviado, a política de privacidade ou os avisos de segurança. O objetivo é melhorar a leitura, não contornar detectores de texto.


## Recuperação de senha do painel

O formulário **Esqueci minha senha** do próprio painel envia o callback `/atelier-7e4c19b2?recovery=1`, derivado da origem que está aberta no navegador. No Supabase, abra **Authentication > URL Configuration** e configure:

- **Site URL**: `https://8328-i9xjuwcxwqiddpq2fsr63-0aa4212d.us5.manus.computer` (origem do Preview do projeto, sem `localhost` e sem a rota do painel).
- **Redirect URLs**: `https://8328-i9xjuwcxwqiddpq2fsr63-0aa4212d.us5.manus.computer/atelier-7e4c19b2?recovery=1`.

Salve, abra o painel pelo link do Preview deste projeto (não por `localhost`), solicite um **novo** email pelo formulário do painel e use esse email. Links enviados antes da correção podem continuar apontando para o destino antigo. Se o endereço do Preview mudar, atualize as duas entradas com a origem atual. Um envio manual pelo Dashboard do Supabase não passa pelo `redirectTo` deste formulário e pode usar apenas a `Site URL`. Quando o site for publicado, substitua a **Site URL** pela origem de produção e inclua também o callback de produção em **Redirect URLs**. Se você personalizou o template de email para montar o link diretamente, use `{{ .RedirectTo }}` como destino dinâmico, em vez de fixar `{{ .SiteURL }}`.

O provedor de email padrão do Supabase Auth tem limite de 2 emails de autenticação por hora. Se aparecer `email rate limit exceeded`, pare de repetir o pedido e aguarde a renovação do limite; não é necessário domínio próprio para usar o provedor padrão. O domínio que o Resend exige para um remetente verificado é separado do domínio do site. Só será necessário configurar SMTP próprio se quiser usar o Resend para os emails de Auth. Nesse caso, verifique um domínio no Resend e configure no Supabase em **Authentication > Email > SMTP Settings**: host `smtp.resend.com`, porta `465`, usuário `resend` e a chave API do Resend como senha SMTP. Informe também um remetente desse domínio verificado. A configuração personalizada cobre emails de recuperação e outros emails de Auth. O limite inicial documentado após configurar SMTP é de 30 emails por hora e pode ser ajustado em **Authentication > Rate Limits**. Nunca envie a chave por chat.

Referências oficiais: [limites do Supabase Auth](https://supabase.com/docs/guides/auth/rate-limits), [SMTP personalizado no Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [SMTP do Resend para Supabase](https://resend.com/docs/send-with-supabase-smtp) e [recuperação de senha](https://supabase.com/docs/guides/auth/passwords).

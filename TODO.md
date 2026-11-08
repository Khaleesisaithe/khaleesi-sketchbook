# TODO — Portfólio de tatuagem | Sketchbook digital

## 1. Identidade visual, layout e navegação
- [x] Desenvolva um site responsivo, funcional e profissional para meu portfólio de tatuagens. O conceito é um *sketchbook digital interativo*, com estética gótica, artística e autoral.
- [x] O site deve parecer um caderno de desenhos físico, com:
  - [x] Textura de papel e páginas de sketchbook.
  - [x] Tipografias góticas baseadas nas referências do manual enviado.
  - [x] Ilustrações, rabiscos, anotações e símbolos desenhados à mão.
  - [x] Elementos animados, desenhos que aparecem progressivamente, efeitos parallax e transições de páginas.
  - [x] Composição orgânica e assimétrica.
- [x] Utilize o manual de cuidados enviado para extrair a paleta de cores, tipografia e identidade gráfica. As referências visuais devem orientar todo o design. Evite templates genéricos.
- [x] Instrução atual: não gerar nem criar imagens agora; usar tipografia e linhas/rabiscos feitos em CSS. Deixar espaços identificados para fotografias reais que serão fornecidas depois.
- [x] Home: capa interativa, apresentação artística e atalhos de navegação.

## 2. Portfólio e catálogos
- [x] Portfólio: galeria de tatuagens com categorias e visualização ampliada.
- [x] Flashes: desenhos disponíveis, tamanhos, preços e status.
- [x] Artes disponíveis: desenhos autorais com valores e dimensões sugeridas.
- [x] Utilizar placeholders identificados para os dados que fornecerei posteriormente; não inventar tatuagens, preços, medidas, disponibilidade ou biografia.

## 3. Inspirações, redes e contato
- [x] Inspirações: integração com Pinterest ou incorporação de painéis.
- [x] Instagram: acesso ao perfil e possibilidade de exibir publicações.
- [x] WhatsApp: contato direto com mensagem pré-preenchida.
- [x] Usar placeholders identificados até que sejam fornecidos os links/perfil/telefone reais; não inventar informações de contato.

## 4. Manual de cuidados
- [x] Cuidados: reconstrução completa do manual enviado, preservando todas as informações e suas respectivas seções.
- [x] Preservar o conteúdo de **Antes da sessão**, **Durante a sessão**, **Pós tattoo**, **Alimentos e tattoo** e **Condições para retoques**, sem eliminar itens do manual ou criar recomendações clínicas novas.
- [x] Antes da sessão: manter higiene da pele, descanso, alimentação e água, hidratação e orientações de dor/desconforto, incluindo todos os detalhes e intervalos descritos no PDF.
- [x] Durante a sessão: manter as instruções sobre acompanhantes, estado emocional e agendamento, além de qualquer outra informação da seção.
- [x] Pós tattoo: manter cuidados das primeiras horas, higiene, secagem, pomada, evitar tocar/coçar, cicatrização, exposição a sol/praia/piscina, sinais de atenção, alimentação e hidratação recomendadas e a evitar, e todo o restante da seção.
- [x] Condições para retoques: manter literalmente as condições e informações de contato/agendamento/cobrança que constam nessa seção do manual, sem acrescentar condições ausentes.

## 5. Agendamento e disponibilidade
- [x] Criar formulário com nome, e-mail, WhatsApp, tatuagem desejada, local do corpo, tamanho, referências, data e horário.
- [x] O sistema deve:
  - [x] Consultar os horários disponíveis.
  - [x] Impedir reservas duplicadas.
  - [x] Registrar solicitações como pendentes.
  - [ ] Notificar-me por e-mail.
  - [x] Permitir aprovação ou recusa pelo painel administrativo.
  - [ ] Enviar automaticamente a resposta ao cliente.
  - [x] Permitir cancelamentos, reagendamentos e bloqueio de horários.
- [x] A confirmação deve depender exclusivamente da minha aprovação.
- [x] Não exibir ao público dados pessoais de outros clientes; horários pendentes ou aprovados não podem aceitar uma solicitação duplicada.
- [x] Bloqueios manuais não podem se sobrepor a pedidos pendentes/aprovados; a inserção de bloqueios, aprovação e reagendamento devem verificar a disponibilidade também sob requisições simultâneas.

## 6. Painel administrativo
- [x] Criar painel protegido para administrar:
  - [x] Portfólio e fotografias.
  - [x] Flashes, preços e disponibilidade.
  - [x] Artes autorais.
  - [x] Agendamentos e calendário.
  - [x] Horários de atendimento.
  - [x] Integrações e informações de contato.
- [x] Todas as alterações devem refletir automaticamente no site.
- [x] Na tela de acesso, a conta autorizada pode solicitar recuperação de senha por email; a resposta não revela se o endereço existe. O link retorna à rota autorizada do painel, a pessoa define uma nova senha apenas com uma sessão de recuperação válida e limites de envio do Supabase são mostrados sem tentativas automáticas repetidas.

## 7. Segurança cibernética e LGPD
- [x] Segurança deve ser requisito de arquitetura, não um acabamento posterior.
- [ ] Implementar:
  - [x] Autenticação segura e controle de acesso por função.
  - [x] Proteção de rotas administrativas.
  - [x] Autorização no servidor e políticas RLS no banco de dados.
  - [x] Validação e sanitização de entradas no front-end e back-end.
  - [x] Proteção contra SQL Injection, XSS, CSRF e abuso de formulários.
  - [x] Rate limiting e proteção contra tentativas automatizadas de acesso.
  - [x] Upload seguro, com validação de formato, tamanho e conteúdo dos arquivos.
  - [x] Segregação de dados dos clientes e armazenamento seguro.
  - [x] HTTPS, gestão de segredos e variáveis de ambiente.
  - [ ] Backups e estratégia de recuperação.
  - [x] Logs de auditoria para operações administrativas.
  - [x] Consentimento e tratamento adequado de dados conforme a LGPD.
  - [x] Política de privacidade e mecanismo para solicitação de exclusão de dados.
- [x] Nunca expor senhas, tokens, chaves privadas ou credenciais no código público. Não confiar exclusivamente em validações feitas pelo navegador.

## 8. Tecnologia e integrações
- [x] Preferencialmente:
  - [x] Next.js ou React.
  - [x] TypeScript.
  - [x] Tailwind CSS.
  - [x] Supabase para banco, autenticação e armazenamento.
  - [x] Serviço de e-mail transacional.
- [x] Escolher arquitetura segura, escalável e de baixo custo operacional.
- [x] Conectar Supabase PostgreSQL/Auth/Storage para cumprir RLS. Manter a base MySQL Manus provisionada sem uso pela aplicação; não executar migrações ou testes nela.
- [ ] Implementar email transacional pelo provedor escolhido no plano. Não afirmar que notificações reais funcionam antes de configurar chave, remetente e domínio válidos.
- [x] Guardar credenciais em entrada protegida/variáveis de ambiente; não pedir nem registrar segredos no chat, fonte, Git ou logs.

## 9. Responsividade, desempenho e entrega
- [x] O site deve funcionar perfeitamente em celulares, tablets e computadores. Priorizar imagens otimizadas, carregamento rápido, acessibilidade e animações leves.
- [ ] Não entregar apenas um protótipo visual. Implementar funcionalidades reais, testar formulários, permissões, agendamentos, notificações e integrações.
- [x] Utilizar placeholders identificados para dados que fornecerei posteriormente.
- [x] Antes de finalizar, analisar todos os arquivos de referência enviados. Não descartar informações do manual de cuidados nem inventar conteúdos.
- [x] Objetivo final: criar um sketchbook digital autoral, gótico e interativo, que funcione como portfólio, catálogo de tatuagens e plataforma profissional de atendimento e agendamento.


## 10. Revisão editorial solicitada
- [x] Instalar Humanizer globalmente para os agentes compatíveis. O CLI não oferece instalação global para Eve e PromptScript; o destino verificado é `~/.agents/skills/humanizer`.
- [x] Revisar a linguagem das páginas públicas de apresentação, navegação, catálogos, inspirações, agendamento e estados vazios, sem mudar o sentido nem acrescentar informações.
- [x] Manter sem reescrita o manual transcrito, a política de privacidade e os avisos de segurança; a revisão busca clareza e não contornar detectores de texto.


## 11. Atualização visual e navegação solicitada
- [x] Remover qualquer atalho ou link ao painel administrativo da navegação pública, rodapé e Home. Usar uma rota pouco óbvia, com autenticação Supabase mantida e sem indexação; o caminho é apenas uma camada de discrição, nunca substitui senha/autorização.
- [x] Entregar um arquivo de texto com o link público de Preview e o link específico da artista. Indicar que o site não está publicado e ainda não tem domínio próprio.
- [x] Usar a imagem do alfabeto enviada como referência estética para tipografia blackletter e marcas/arabescos feitos em CSS; não copiar o QR, não gerar novas imagens e não exibir arte ou foto fictícia.
- [x] Aumentar moderadamente o tamanho e a legibilidade das letras no site público, incluir movimento de troca de página ao navegar e respeitar a preferência por movimento reduzido.
- [x] Diferenciar o painel da artista: tipografia de interface distinta, estrutura intuitiva/profissional, visual administrativo separado do sketchbook público.
- [x] Na Home, deixar espaço para informações adicionais sobre a artista sem inventá-las; preencher apenas os dados reais que ela fornecer.
- [x] Incluir, quando cadastrados, ícones e links para Instagram, YouTube e o portfólio externo da artista, sem inventar @, canais ou endereços.
- [x] Permitir exibir publicações públicas de Instagram, escolher e destacar uma delas e não carregar embeds de terceiros antes do consentimento do visitante. Não fazer scraping nem prometer sincronização automática sem a conta profissional, permissões e credenciais Meta necessárias.
- [x] Exibir o painel público do Pinterest indicado pela artista por meio do widget oficial e carregá-lo apenas após a escolha do visitante.
- [ ] Pendências de conteúdo: texto/bio da artista, @/URL real do Instagram, URLs dos posts a exibir ou decisão de integração automática, URL do YouTube, URL do portfólio externo e URL pública da pasta/board do Pinterest.

## 12. Ativação das integrações sociais
- [ ] Aplicar a migração aditiva `supabase/migrations/20261106010000_extend_social_profile.sql` no projeto Supabase da aplicação antes de gravar os novos campos de YouTube, portfólio externo e posts do Instagram.
- [ ] Aplicar `supabase/migrations/20261106020000_guard_weekly_hours_overlap.sql` no Supabase de desenvolvimento antes de cadastrar horários reais, para que a constraint do banco também bloqueie sobreposições concorrentes.
- [ ] Depois de receber os endereços reais da artista, preencher e publicar os links, posts de Instagram e painel público do Pinterest; nenhum endereço de perfil ou publicação foi inventado.


## 13. Fundo de arte sincronizado à rolagem
- [x] A imagem WebP enviada pela artista aparece como primeiro quadro visível ao abrir uma página pública.
- [x] A imagem e os quadros do MP4 enviado formam o fundo visual fixo, em tela cheia e atrás do conteúdo público; não são uma seção no topo ou rodapé.
- [x] A rolagem vertical faz os quadros do vídeo avançarem e retrocederem gradualmente conforme o visitante se move; sem rolagem, o fundo permanece parado, sem reprodução automática.
- [x] Preservar a proporção e a arte inteira em telas de diferentes formatos; preencher o espaço excedente de forma harmônica, sem esticar nem cortar o quadro principal.
- [x] Manter o texto e os controles legíveis e acessíveis, conservar o painel administrativo com seu visual separado e respeitar `prefers-reduced-motion`.

## 14. Armazenamento dos assets de fundo
- [x] O WebP fornecido e a versão sem áudio do MP4 original ficam guardados no storage do projeto; as URLs servidas no Preview são válidas e podem ser usadas pelo fundo scroll-scrub.

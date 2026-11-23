# Portal Imobiliário Valeria

Portal de catálogo imobiliário com área administrativa de acesso restrito.

## Stack

- HTML5, CSS3 e JavaScript (frontend sem framework)
- Supabase: PostgreSQL, Auth e Storage
- Vercel: hospedagem estática

## Funcionalidades

### Portal público
- Listagem de imóveis publicados
- Busca por título, endereço, bairro, cidade e descrição
- Filtros por tipo e finalidade
- Modal de detalhes, fotos e características
- CTA de contato por WhatsApp (configurável)

### Painel administrativo (`/admin.html`)
- Login com Supabase Auth
- Criar, editar e excluir imóveis
- Upload de múltiplas imagens
- Status: publicado, rascunho e vendido/alugado
- Indicadores e busca no catálogo

## 1. Criar e configurar o Supabase

1. Crie um projeto em https://supabase.com.
2. Abra **SQL Editor** e execute todo o conteúdo de `supabase-schema.sql`.
3. Em **Authentication > Users**, crie manualmente o usuário administrador (e-mail e senha).
4. Em **Authentication > Providers > Email**, mantenha o provedor habilitado e desative signups/cadastros públicos. O painel não oferece cadastro.
5. Em **Project Settings > API**, copie a Project URL e a chave `anon`/`publishable`.
6. Edite `config.js`:
   - `SUPABASE_URL`: URL do projeto
   - `SUPABASE_ANON_KEY`: chave pública anon/publishable
   - `CONTACT_WHATSAPP`: número completo com DDI e DDD, apenas dígitos (ex.: `5521999999999`).

**Nunca coloque a chave `service_role` no navegador, no GitHub ou no arquivo `config.js`.** A chave pública é segura para uso no frontend somente porque as tabelas e o Storage estão protegidos por RLS.

## 2. Testar localmente

Não abra o HTML por `file://`. Sirva a pasta por um servidor local. Por exemplo, com Python instalado:

```bash
python -m http.server 5500
```

Acesse:
- Portal: http://localhost:5500
- Administração: http://localhost:5500/admin.html

Faça login com o usuário criado no Supabase. Cadastre um imóvel de teste como **Publicado** e confira se ele aparece no portal em outra aba anônima.

## 3. Publicar na Vercel

1. Envie os arquivos do projeto para um repositório GitHub.
2. Na Vercel, selecione **Add New > Project** e importe o repositório.
3. Framework Preset: **Other**.
4. Build Command: deixe vazio.
5. Output Directory: `.` (raiz).
6. Clique em Deploy.
7. No Supabase, em **Authentication > URL Configuration**, configure:
   - Site URL: domínio final da Vercel
   - Redirect URLs: domínio final e URL local de teste, se necessário.
8. Teste o login, cadastro, upload e visualização no domínio publicado.

## 4. Segurança e operação

- RLS é a camada de segurança real; esconder links ou páginas não substitui autorização no banco.
- O portal não possui cadastro público de usuários.
- A política atual permite CRUD a qualquer usuário autenticado no projeto. Como o produto é de um único administrador, mantenha apenas uma conta administrativa e não distribua credenciais. Para maior isolamento, evolua a autorização para uma tabela de perfis/allowlist com o UUID do administrador.
- Imagens são públicas para visualização, mas o upload exige autenticação.
- A exclusão do imóvel não apaga automaticamente os arquivos de imagem do Storage. Faça a limpeza dos objetos não utilizados no Storage periodicamente ou implemente uma rotina de exclusão segura.
- Não armazene dados pessoais desnecessários de proprietários/locatários no catálogo.
- Antes de produção, configure domínio próprio, política de privacidade, consentimento/cookies se aplicável e revise os textos comerciais.

## Estrutura

```text
portal-imobiliario-valeria/
├── index.html
├── admin.html
├── styles.css
├── config.js
├── app.js
├── admin.js
├── supabase-schema.sql
├── vercel.json
└── README.md
```

## Observações

Este projeto é uma base funcional para implantação. O catálogo começa vazio e será preenchido pelo painel administrativo. A fotografia de capa do hero é uma imagem demonstrativa externa; substitua por uma imagem licenciada/da imobiliária antes da publicação comercial.

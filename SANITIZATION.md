# Escopo da edição aberta

Esta é uma nova árvore de arquivos, sem `.git`, commits ou histórico do projeto
original. O projeto original não foi alterado para preparar esta edição.

## Código de origem selecionado

Foram selecionados oito arquivos do núcleo original: `reportHtmlSafety.js` e
seus testes, `audioSecurity.js` e seus testes, `clinicalLocale.js` e seus testes,
`clinicalSourceLimits.js` e `input.js`. Eles foram colocados em `src/`.
A configuração genérica `AUDIO_STORAGE_ORIGIN` substitui a variável específica
do fornecedor de storage. Nomes de hosts de infraestrutura usados em testes
foram substituídos por hosts sintéticos e comentários operacionais privados
foram removidos.

O validador/renderizador `document.js`, o CLI, seus testes e a documentação
foram adicionados para tornar o núcleo executável de forma independente.
Os exemplos não derivam de prontuários ou consultas reais.

A revisão de segurança desta edição também corrigiu uma validação de áudio:
endereços IP literais privados são negados em produção antes da conexão,
inclusive IPv4 mapeado em IPv6, porque o Node ignora o hook de DNS nesses
destinos. Testes cobrem a política e bloqueiam uma tentativa sintética contra
um servidor de loopback local. A correção pertence a esta edição aberta.

## Exclusões

- Histórico Git, ambientes, chaves, credenciais, cookies e configurações locais.
- Bancos e migrações do SaaS, backups, pacientes, contatos, cadastros e uploads.
- Gravações, transcrições, documentos clínicos, dados de avaliação ou treinamento.
- Identidades administrativas, organizações, IDs externos e domínios de produção.
- Deploy, nuvem, workflows operacionais, observabilidade e automações de marketing.
- Cobrança, assinaturas, e-mail, redes sociais e integrações de terceiros.
- Logotipos, fotografias, mídia gerada e outros ativos da marca original.
- Interface autenticada, landing comercial, modelos e serviços de inferência.

## Licenciamento e revisão

A licença MIT cobre o código próprio incluído nesta edição por autorização do
titular do projeto. Não transfere marcas nem altera licenças de dependências.
As dependências continuam sob suas licenças originais.

`npm run scan` procura padrões de credenciais e identificadores pessoais no
conteúdo publicável, além de arquivos operacionais que não podem fazer parte
da edição. O resultado é um controle adicional; revisão humana ainda é
necessária antes de publicar novas cópias de código privado.

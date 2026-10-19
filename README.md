# ZelloLife Open

Biblioteca JavaScript independente para construir ferramentas de documentos
clínicos. O núcleo vem do ZelloLife e pode ser baixado, estudado, modificado e
redistribuído sob a licença MIT.

Esta primeira edição publica um núcleo reutilizável, **não o SaaS completo**.
Ela funciona localmente sem conta, banco de dados, GPU, credenciais ou serviço
de IA. Não contém prontuários, dados de clientes, treinamento de modelos,
integrações comerciais ou configuração da instalação original.

## Executar

Requer Node.js 22.12 ou posterior e npm. No diretório do repositório:

```sh
npm ci --ignore-scripts
npm run check
npm run demo
```

O exemplo contém apenas texto sintético. A saída é JSON com o idioma e HTML
sanitizado. A ferramenta não grava documentos nem envia conteúdo para a rede.

```sh
node src/cli.js examples/synthetic-document.json
node src/cli.js --help
```

Também é possível encaminhar JSON por entrada padrão, sem criar um arquivo
temporário:

```sh
node src/cli.js - < examples/synthetic-document.json
```

Arquivos e entrada padrão aceitam no máximo 1 MiB de JSON codificado em UTF-8.
O limite é aplicado durante a leitura, antes do parser. Bytes UTF-8 inválidos ou
truncados são rejeitados para evitar substituir silenciosamente o texto
fornecido. Em caso de erro, o CLI não imprime conteúdo parcial, caminhos ou
mensagens do parser; retorna apenas um código fechado e sai com status 1.
`DOCUMENT_FILE_TOO_LARGE` identifica excesso de bytes nas duas formas de entrada.

Para usar como dependência antes de uma publicação no npm:

```sh
# Dentro do projeto consumidor, apontando para este checkout:
npm install /caminho/para/zellolife-open
```

```js
import { renderDocument, sanitizeReportHtml, isInternalAudioPath } from 'zellolife-open';

const document = renderDocument({
  locale: 'pt-br',
  sections: [{ heading: 'Exemplo sintético', text: 'Texto fornecido pela pessoa usuária.' }],
});
console.log(document.html);
console.log(sanitizeReportHtml('<p>Texto</p><script>alert(1)</script>'));
console.log(isInternalAudioPath('synthetic/example.webm'));
```

## Recursos

- Renderização determinística: preserva o texto fornecido, escapa HTML e não
  inventa achados ou completa informações clínicas ausentes.
- Sanitização de HTML por lista de tags e atributos permitidos, sem scripts,
  estilos, formulários, URLs, imagens externas ou manipuladores de eventos.
- Idiomas `pt-br`, `en-us` e `es`, com validação da compatibilidade entre idioma
  da evidência e do documento para provedores locais.
- Validação de caminhos de áudio, hosts autorizados, redirecionamentos e
  resolução DNS fixada ao endereço validado para reduzir risco de SSRF.
- Limites de tamanho de documentos, contagem de texto de evidências e auxiliares
  de entrada para aplicações que integram um modelo de linguagem.

## Política de URLs de áudio

`isInternalAudioPath` não usa configuração. As funções de validação de URLs
negam destinos por padrão. Configure **sua própria** origem em
`AUDIO_STORAGE_ORIGIN` ou hosts exatos em `AUDIO_LEGACY_URL_ALLOWED_HOSTS`.
O limite opcional `AUDIO_MAX_DOWNLOAD_BYTES` aceita de 1 byte a 1 GiB.
O arquivo `.env.example` apenas documenta as opções; não é carregado.

`createAudioDownloadAgents()` fornece agentes HTTP/HTTPS com verificação DNS.
O consumidor precisa usar esses agentes na conexão real, aplicar o limite de
bytes e chamar `validateAudioRedirect` em **cada** redirecionamento. Validar
apenas a string de uma URL não protege o transporte contra DNS rebinding.
Em produção, execute com `NODE_ENV=production`; endereços privados são negados,
incluindo IPs literais, IPv4 mapeado em IPv6 e formas de IPv4 normalizadas pelo
parser de URLs. Esses IPs são verificados antes da conexão, pois o Node ignora
o resolvedor DNS para destinos literais.
O modo de desenvolvimento permite resolução privada somente para a origem de
storage explicitamente configurada.

## Limites deste núcleo

Não há autenticação, armazenamento clínico, transcrição, modelo de IA, receita
assinada ou decisão médica. Os limites do parser não substituem autorização,
consentimento, retenção e controle de acesso de uma aplicação completa.
Conteúdo clínico deve ser revisado por um profissional habilitado. Não envie
dados pessoais em issues, exemplos ou pull requests.

Veja [a origem e as exclusões da edição](SANITIZATION.md), [como contribuir](CONTRIBUTING.md),
[a política de segurança](SECURITY.md) e [as licenças de dependências](THIRD_PARTY_NOTICES.md).

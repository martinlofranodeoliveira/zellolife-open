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
import { renderDocument, renderPlainTextDocument, sanitizeReportHtml, isInternalAudioPath } from 'zellolife-open';

const document = renderDocument({
  locale: 'pt-br',
  sections: [{ heading: 'Exemplo sintético', text: 'Texto fornecido pela pessoa usuária.' }],
});
console.log(document.html);
console.log(renderPlainTextDocument({
  locale: 'pt-br',
  sections: [{ heading: 'Exemplo sintético', text: 'Texto fornecido pela pessoa usuária.' }],
}).text);
console.log(sanitizeReportHtml('<p>Texto</p><script>alert(1)</script>'));
console.log(isInternalAudioPath('synthetic/example.webm'));
```

## Recursos

- Renderização determinística: preserva o texto fornecido, escapa HTML e não
  inventa achados ou completa informações clínicas ausentes.
- Exportação em texto simples (`renderPlainTextDocument`): usa a mesma
  validação do documento HTML e retorna `{ locale, text }` com título
  normalizado + LF + texto original, separando seções por dois LF, sem
  interpretar HTML, sem inferir achados e sem gravar ou enviar dados. Esta
  edição continua um núcleo reutilizável, não o SaaS completo, e não realiza
  decisão clínica.
- Resumo de metadados (`summarizeDocumentMetadata`): usa a mesma
  validação do documento HTML e retorna apenas `{ locale, sectionCount,
  characterCount }`, sem copiar títulos, textos, identificadores ou campos
  desconhecidos. `locale` é normalizado, `sectionCount` é o número de
  seções e `characterCount` soma `heading.trim().length + text.length` em
  unidades UTF-16 (`String.length`), sem contar o idioma nem separadores de
  apresentação. Markup, quebras de linha e texto contam literalmente, sem
  renderização ou escaping. Os limites são validados no tamanho original
  antes do trim (1 a 100 seções, título original não vazio de até 200
  unidades UTF-16, soma original de título+texto até 180000), sem trocar o
  limite por bytes ou code points. A entrada não é modificada e nada é
  gravado ou enviado. Esta edição continua um núcleo reutilizável sem dados
  ou serviços clínicos reais e não realiza decisão clínica.

```js
import { summarizeDocumentMetadata } from 'zellolife-open';

const summary = summarizeDocumentMetadata({
  locale: 'PT-BR ',
  sections: [{ heading: '  Exemplo  ', text: 'Texto.' }],
});
console.log(summary); // { locale: 'pt-br', sectionCount: 1, characterCount: 13 }
```
- Fragmentação de texto simples (`chunkPlainTextDocument`): reutiliza
  `renderPlainTextDocument` para validação, normalização de `locale` e texto
  exato, e divide o texto em `chunks` para leitura/iteração local. Retorna
  `{ locale, chunks }` com `chunks.join("") === renderPlainTextDocument(input).text`.
  Uso apenas sintético e local, sem envio automático, escrita de arquivos ou
  integração de UI:

```js
import { chunkPlainTextDocument, renderPlainTextDocument } from 'zellolife-open';

const input = {
  locale: 'pt-br',
  sections: [{ heading: 'Exemplo sintético', text: 'Texto fornecido pela pessoa usuária.' }],
};
const { locale, chunks } = chunkPlainTextDocument(input); // maxCharacters omitido = 4000
for (const chunk of chunks) {
  console.log(chunk.length, chunk);
}
console.log(chunks.join("") === renderPlainTextDocument(input).text); // true
```

  Regras: `maxCharacters` omitido ou `undefined` usa `4000`; após o padrão,
  somente número primitivo inteiro com `256 <= valor <= 16384` (unidades UTF-16/
  `String.length`) é aceito, qualquer outro tipo/valor lança
  `RangeError("DOCUMENT_CHUNK_SIZE_INVALID")` sem coerção e antes da validação
  do documento (tamanho inválido tem precedência). Reutiliza o validador e os
  limites originais (1 a 100 seções, título original não vazio até 200 unidades,
  soma original título+texto até 180000) sem relaxar. Partição gulosa por prefixos
  máximos de até `maxCharacters` unidades, recuando exatamente 1 só quando `end`
  dividiria um par alto `D800..DBFF` + baixo `DC00..DFFF` adjacente; preserva
  surrogates isolados, nunca gera chunk vazio, nunca divide par válido, sem
  normalização e sem preservação de parágrafo/palavra/CRLF/grafema. Os limites são
  caracteres/unidades de código, não bytes, tokens, palavras, parágrafos ou clusters
  de grafema; os chunks contêm o conteúdo original e não são anonimização nem
  decisão clínica. Continua núcleo reutilizável/protótipo, não o SaaS completo.
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

### Caminhos relativos de objetos

`isInternalAudioPath(value)` retorna um booleano e valida caminhos relativos de
até 2.048 unidades UTF-16, sem modificar, normalizar ou devolver o conteúdo.
Valores que não sejam strings, caminhos vazios, barras iniciais, esquemas de
URL, barras invertidas, query/fragmento, controles ASCII (C0 e DEL), segmentos
vazios, `.` ou `..` são recusados. Espaços nas extremidades também são recusados.

Escapes percentuais precisam representar UTF-8 válido. Cada segmento é
decodificado uma vez apenas para validação: separadores, controles, query ou
fragmento codificados são recusados, assim como segmentos que se tornam `.` ou
`..`. Qualquer `%` restante após essa passagem é recusado, impedindo codificação
aninhada. O caminho
decodificado completo também deve continuar relativo, sem esquema de URL nem
espaços nas extremidades. Isso impede que controles removidos pelo parser ou
escapes de travessia transformem um caminho aceito em outro destino.

Nomes comuns, Unicode, espaços interiores e escapes benignos continuam aceitos:

```js
isInternalAudioPath('synthetic/áudio.webm'); // true
isInternalAudioPath('synthetic/audio%20sample.webm'); // true
isInternalAudioPath('synthetic/file%2ename.webm'); // true
isInternalAudioPath('/synthetic/audio.webm'); // false
isInternalAudioPath('synthetic/%2e%2e/audio.webm'); // false
isInternalAudioPath('synthetic%2faudio.webm'); // false
```

A recusa de caminhos iniciados por `/` e de codificações ambíguas torna mais
estritos alguns valores anteriormente aceitos. Use o caminho validado com uma
base de armazenamento confiável terminada em `/`. O helper não verifica existência,
permissões, links simbólicos, regras de filesystem ou interpretações específicas
de proxies/servidores. Não substitui autorização nem as verificações de URL,
redirecionamento e transporte descritas a seguir.

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


<!-- community-core:document-outline-index -->
### Deterministic document outline index for navigation

Lets local document tools derive a table-of-contents-like index without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are indexed, preserves trimmed headings exactly, and reports text lengths for local layout budgeting. The operation stays deterministic, performs no clinical inference, and requires no account, network, or UI integration.

Reusable deterministic JSON core: `src/community/document_outline_index.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success return an object with locale and outline where locale is normalized and outline has one entry per section in order with index as zero-based integer, heading as trimmed string, and textLength as text.length in UTF-16 units. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and outline triples, never full text, unknown fields, or identifiers.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo  ",
        "text": "Texto."
      },
      {
        "heading": "Notas",
        "text": "Mais texto"
      }
    ]
  },
  "output": {
    "locale": "pt-br",
    "outline": [
      {
        "heading": "Exemplo",
        "index": 0,
        "textLength": 6
      },
      {
        "heading": "Notas",
        "index": 1,
        "textLength": 10
      }
    ]
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "Intro",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "locale": "en-us",
    "outline": [
      {
        "heading": "Intro",
        "index": 0,
        "textLength": 2
      }
    ]
  }
}
```

Public regression tests: `src/community_document_outline_index.test.js`.

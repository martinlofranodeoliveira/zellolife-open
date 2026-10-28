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


<!-- community-core:document-section-offset-map -->
### Deterministic document section offset map for local slicing

Lets local document tools map and slice plain-text exports without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports UTF-16 start offsets and lengths that sum to the exact plain-text length for local navigation and iteration, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_section_offset_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success define sectionText as trimmed heading plus single LF (U+000A) plus original text per section and fullText as sectionText joined with double LF, with all lengths in UTF-16 String.length units. For each section in order compute length as sectionText length and start as UTF-16 offset in fullText with first start zero and each next start equal to previous start plus previous length plus 2 for the separator, using for-of iteration in order without indexed access. Return an object with locale, totalLength and boundaries where locale is normalized, totalLength equals fullText length, and boundaries has one entry per section in order with index as zero-based integer, start as integer and length as integer. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale, totalLength and boundary triples, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
    "boundaries": [
      {
        "index": 0,
        "length": 14,
        "start": 0
      },
      {
        "index": 1,
        "length": 16,
        "start": 16
      }
    ],
    "locale": "pt-br",
    "totalLength": 32
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
    "boundaries": [
      {
        "index": 0,
        "length": 8,
        "start": 0
      }
    ],
    "locale": "en-us",
    "totalLength": 8
  }
}
```

Public regression tests: `src/community_document_section_offset_map.test.js`.


<!-- community-core:document-heading-duplicate-map -->
### Deterministic heading duplicate map for local navigation

Lets local document tools disambiguate repeated headings when building navigation anchors without rendering HTML or copying heading text. It reuses existing document validation so only well-formed inputs are checked, reports exact first-occurrence indices deterministically for local TOC and anchor planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_heading_duplicate_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success define trimmedHeading as heading.trim() per section in order. Track first occurrence with a Map from trimmedHeading to first index using for-of in order with Map get/set and no indexed access. For each section in order produce entry with index as zero-based integer, isDuplicate as boolean true when trimmedHeading was seen before, and firstIndex as integer of first occurrence. Return an object with locale, duplicates and uniqueCount where locale is normalized, duplicates has one entry per section in order, and uniqueCount equals Map size. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale, duplicate triples and uniqueCount, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Resumo",
        "text": "Texto um."
      },
      {
        "heading": "Resumo",
        "text": "Texto dois."
      },
      {
        "heading": "  Resumo  ",
        "text": "Texto tres."
      }
    ]
  },
  "output": {
    "duplicates": [
      {
        "firstIndex": 0,
        "index": 0,
        "isDuplicate": false
      },
      {
        "firstIndex": 0,
        "index": 1,
        "isDuplicate": true
      },
      {
        "firstIndex": 0,
        "index": 2,
        "isDuplicate": true
      }
    ],
    "locale": "pt-br",
    "uniqueCount": 1
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
      },
      {
        "heading": "Notes",
        "text": "Hello"
      }
    ]
  },
  "output": {
    "duplicates": [
      {
        "firstIndex": 0,
        "index": 0,
        "isDuplicate": false
      },
      {
        "firstIndex": 1,
        "index": 1,
        "isDuplicate": false
      }
    ],
    "locale": "en-us",
    "uniqueCount": 2
  }
}
```

Public regression tests: `src/community_document_heading_duplicate_map.test.js`.


<!-- community-core:document-blank-section-index -->
### Deterministic blank-section index for local completion checks

Lets local document tools flag empty or whitespace-only sections for completion checks without rendering HTML or copying section text. It reuses existing document validation so only well-formed inputs are inspected, reports ordered blank indexes and counts for local iteration, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_blank_section_index.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define isBlank as text.trim().length equals 0, collecting zero-based index when true. Return an object with locale, blankIndexes and blankCount where locale is normalized, blankIndexes is an array of zero-based integers in ascending order, and blankCount equals blankIndexes.length. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and blank indicators, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exemplo",
        "text": "Texto."
      },
      {
        "heading": "Notas",
        "text": "   "
      },
      {
        "heading": "Fim",
        "text": ""
      }
    ]
  },
  "output": {
    "blankCount": 2,
    "blankIndexes": [
      1,
      2
    ],
    "locale": "pt-br"
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
    "blankCount": 0,
    "blankIndexes": [],
    "locale": "en-us"
  }
}
```

Public regression tests: `src/community_document_blank_section_index.test.js`.


<!-- community-core:document-line-break-audit-map -->
### Deterministic text line-break audit map for local rendering

Lets local document tools predict HTML line breaks and plain-text line structure without rendering HTML or copying full text. It reuses existing document validation so only well-formed inputs are audited, reports per-section LF counts that exactly match future br inserts for local layout budgeting, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_line_break_audit_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define lineBreaks as count of U+000A LF characters in original text by single for-of pass, where each LF counts as one including the LF of each CRLF pair and lone U+000D CR counts as zero to match renderDocument br inserts; heading line breaks are ignored. Produce entry with index as zero-based integer and lineBreaks as integer. Compute totalLineBreaks as sum of lineBreaks. Return an object with locale, breaks and totalLineBreaks where locale is normalized, breaks has one entry per section in order, and totalLineBreaks equals sum. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and line-break numbers, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exemplo",
        "text": "Linha1\nLinha2\nLinha3"
      },
      {
        "heading": "Notas",
        "text": "Sem quebra"
      }
    ]
  },
  "output": {
    "breaks": [
      {
        "index": 0,
        "lineBreaks": 2
      },
      {
        "index": 1,
        "lineBreaks": 0
      }
    ],
    "locale": "pt-br",
    "totalLineBreaks": 2
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
        "text": "Hi\r\nHo\nHey"
      }
    ]
  },
  "output": {
    "breaks": [
      {
        "index": 0,
        "lineBreaks": 2
      }
    ],
    "locale": "en-us",
    "totalLineBreaks": 2
  }
}
```

Public regression tests: `src/community_document_line_break_audit_map.test.js`.


<!-- community-core:document-heading-length-map -->
### Deterministic heading-length map for local layout budgeting

Lets local document tools budget heading display and storage without rendering HTML or copying heading text. It reuses existing document validation so only well-formed inputs are measured, reports trimmed heading lengths in UTF-16 units for local layout planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_heading_length_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and headingLength as h.length in UTF-16 units. Produce entry with index as zero-based integer and headingLength as integer. Compute totalHeadingChars as sum of headingLengths. Return an object with locale, lengths and totalHeadingChars where locale is normalized, lengths has one entry per section in order, and totalHeadingChars equals sum. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and heading-length numbers, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
    "lengths": [
      {
        "headingLength": 7,
        "index": 0
      },
      {
        "headingLength": 5,
        "index": 1
      }
    ],
    "locale": "pt-br",
    "totalHeadingChars": 12
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
    "lengths": [
      {
        "headingLength": 5,
        "index": 0
      }
    ],
    "locale": "en-us",
    "totalHeadingChars": 5
  }
}
```

Public regression tests: `src/community_document_heading_length_map.test.js`.


<!-- community-core:document-escape-budget-map -->
### Deterministic HTML escape budget map for local size planning

Lets local document tools estimate escaped HTML growth without rendering HTML or copying full text. It reuses existing document validation so only well-formed inputs are measured, counts escapable characters per section for local storage and layout budgeting, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_escape_budget_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and scan h and text with for-of comparing each character with strict equality to count occurrences of U+0026, U+003C, U+003E, U+0022, and U+0027. Define escapeCount as total matches and escapedExtraChars as 4 per U+0026, 3 per U+003C, 3 per U+003E, 5 per U+0022, 4 per U+0027. Produce entry with index as zero-based integer, escapeCount as integer, and escapedExtraChars as integer. Compute totalEscapeCount as sum of escapeCounts and totalEscapedExtraChars as sum of extras. Return an object with locale, budgets, totalEscapeCount, and totalEscapedExtraChars where locale is normalized, budgets has one entry per section in order, and totals equal sums. Newlines count literally with no br conversion. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and escape-budget numbers, never headings, full text, unknown fields, or identifiers. Implementation is a pure ES module with no imports and preserves input. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  A&B  ",
        "text": "x<y>z"
      }
    ]
  },
  "output": {
    "budgets": [
      {
        "escapeCount": 3,
        "escapedExtraChars": 10,
        "index": 0
      }
    ],
    "locale": "pt-br",
    "totalEscapeCount": 3,
    "totalEscapedExtraChars": 10
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
        "text": "Hi \"there\" & 'you'"
      }
    ]
  },
  "output": {
    "budgets": [
      {
        "escapeCount": 5,
        "escapedExtraChars": 22,
        "index": 0
      }
    ],
    "locale": "en-us",
    "totalEscapeCount": 5,
    "totalEscapedExtraChars": 22
  }
}
```

Public regression tests: `src/community_document_escape_budget_map.test.js`.


<!-- community-core:document-sentence-terminator-map -->
### Deterministic sentence-terminator count map for local iteration budgeting

Lets local document tools estimate sentence-like iteration units without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, counts period, exclamation and question marks per section for local display and iteration budgeting, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_sentence_terminator_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and scan h and text with for-of comparing each character with strict equality to count U+002E FULL STOP, U+0021 EXCLAMATION MARK and U+003F QUESTION MARK. Define periodCount as count of U+002E, exclamationCount as count of U+0021, questionCount as count of U+003F, and terminatorCount as their sum. Produce entry with index as zero-based integer, periodCount, exclamationCount, questionCount and terminatorCount as integers. Compute totalPeriodCount, totalExclamationCount, totalQuestionCount and totalTerminatorCount as sums across sections. Return an object with locale, counts, totalPeriodCount, totalExclamationCount, totalQuestionCount and totalTerminatorCount where locale is normalized, counts has one entry per section in order, and totals equal sums. Implementation is a pure ES module with no imports and preserves input. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and terminator-count numbers, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo  ",
        "text": "Texto. Mais texto! Duvida?"
      },
      {
        "heading": "Notas",
        "text": "Sem terminador"
      }
    ]
  },
  "output": {
    "counts": [
      {
        "exclamationCount": 1,
        "index": 0,
        "periodCount": 1,
        "questionCount": 1,
        "terminatorCount": 3
      },
      {
        "exclamationCount": 0,
        "index": 1,
        "periodCount": 0,
        "questionCount": 0,
        "terminatorCount": 0
      }
    ],
    "locale": "pt-br",
    "totalExclamationCount": 1,
    "totalPeriodCount": 1,
    "totalQuestionCount": 1,
    "totalTerminatorCount": 3
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
        "text": "Hi... Really? Yes!"
      }
    ]
  },
  "output": {
    "counts": [
      {
        "exclamationCount": 1,
        "index": 0,
        "periodCount": 3,
        "questionCount": 1,
        "terminatorCount": 5
      }
    ],
    "locale": "en-us",
    "totalExclamationCount": 1,
    "totalPeriodCount": 3,
    "totalQuestionCount": 1,
    "totalTerminatorCount": 5
  }
}
```

Public regression tests: `src/community_document_sentence_terminator_map.test.js`.


<!-- community-core:document-word-count-map -->
### Deterministic section word count map for local review budgeting

Lets local document tools estimate reading and layout effort without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, counts whitespace-delimited words per section for local review planning and iteration budgeting, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_word_count_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and count words in h and text where whitespace is exactly U+0020 SPACE, U+000A LF, U+000D CR or U+0009 TAB compared with strict equality, and a word is a maximal non-empty run of non-whitespace scanned with for-of tracking in-word state; empty or all-whitespace strings yield zero. Define headingWordCount as count in h, textWordCount as count in text, and wordCount as their sum. Produce entry with index as zero-based integer, headingWordCount, textWordCount and wordCount as integers. Compute totalHeadingWords, totalTextWords and totalWords as sums across sections. Return an object with locale, counts, totalHeadingWords, totalTextWords and totalWords where locale is normalized, counts has one entry per section in order, and totals equal sums. Implementation is a pure ES module with no imports and preserves input. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and word-count numbers, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
    "counts": [
      {
        "headingWordCount": 1,
        "index": 0,
        "textWordCount": 1,
        "wordCount": 2
      },
      {
        "headingWordCount": 1,
        "index": 1,
        "textWordCount": 2,
        "wordCount": 3
      }
    ],
    "locale": "pt-br",
    "totalHeadingWords": 2,
    "totalTextWords": 3,
    "totalWords": 5
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "  Case Notes  ",
        "text": "hello   world wide"
      }
    ]
  },
  "output": {
    "counts": [
      {
        "headingWordCount": 2,
        "index": 0,
        "textWordCount": 3,
        "wordCount": 5
      }
    ],
    "locale": "en-us",
    "totalHeadingWords": 2,
    "totalTextWords": 3,
    "totalWords": 5
  }
}
```

Public regression tests: `src/community_document_word_count_map.test.js`.


<!-- community-core:document-digit-count-map -->
### Deterministic digit count map for local numeric density review

Lets local document tools estimate numeric density and review effort without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, counts ASCII digits per section for local layout and manual review budgeting, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_digit_count_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and count ASCII digits in h and text where a digit is a character strictly equal to one of "0", "1", "2", "3", "4", "5", "6", "7", "8", "9" scanned with for-of using strict equality; empty or digit-free strings yield zero. Define headingDigitCount as count in h, textDigitCount as count in text, and digitCount as their sum. Produce entry with index as zero-based integer, headingDigitCount, textDigitCount and digitCount as integers. Compute totalHeadingDigits, totalTextDigits and totalDigits as sums across sections. Return an object with locale, counts, totalHeadingDigits, totalTextDigits and totalDigits where locale is normalized, counts has one entry per section in order, and totals equal sums. Implementation is a pure ES module with no imports and preserves input. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and digit-count numbers, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exame 2024",
        "text": "Pressao 120 por 80."
      },
      {
        "heading": "Notas",
        "text": "Sem digitos aqui"
      }
    ]
  },
  "output": {
    "counts": [
      {
        "digitCount": 9,
        "headingDigitCount": 4,
        "index": 0,
        "textDigitCount": 5
      },
      {
        "digitCount": 0,
        "headingDigitCount": 0,
        "index": 1,
        "textDigitCount": 0
      }
    ],
    "locale": "pt-br",
    "totalDigits": 9,
    "totalHeadingDigits": 4,
    "totalTextDigits": 5
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
        "text": "Hi 7"
      }
    ]
  },
  "output": {
    "counts": [
      {
        "digitCount": 1,
        "headingDigitCount": 0,
        "index": 0,
        "textDigitCount": 1
      }
    ],
    "locale": "en-us",
    "totalDigits": 1,
    "totalHeadingDigits": 0,
    "totalTextDigits": 1
  }
}
```

Public regression tests: `src/community_document_digit_count_map.test.js`.


<!-- community-core:document-trim-delta-map -->
### Deterministic trim-delta map for local normalization review

Lets local document tools predict heading normalization and edge-whitespace budgeting without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports trimmed lengths and trim deltas for local layout planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_trim_delta_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, define headingTrimmedLength as h.length, headingTrimDelta as heading.length minus h.length, textLength as t.length, and textEdgeTrimDelta as t.length minus t.trim().length, all measured in UTF-16 units (String.length) with empty edge-trim yielding zero. Produce entry with index as zero-based integer, headingTrimmedLength, headingTrimDelta, textLength and textEdgeTrimDelta as integers. Compute totalHeadingTrimDelta and totalTextEdgeTrimDelta as sums across sections. Return an object with locale, trims, totalHeadingTrimDelta and totalTextEdgeTrimDelta where locale is normalized, trims has one entry per section in order, and totals equal sums. Implementation is a pure ES module with no imports and preserves input. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and trim-delta numbers, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
        "text": "  Mais texto  "
      }
    ]
  },
  "output": {
    "locale": "pt-br",
    "totalHeadingTrimDelta": 4,
    "totalTextEdgeTrimDelta": 4,
    "trims": [
      {
        "headingTrimDelta": 4,
        "headingTrimmedLength": 7,
        "index": 0,
        "textEdgeTrimDelta": 0,
        "textLength": 6
      },
      {
        "headingTrimDelta": 0,
        "headingTrimmedLength": 5,
        "index": 1,
        "textEdgeTrimDelta": 4,
        "textLength": 14
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
        "text": "Hi\n"
      }
    ]
  },
  "output": {
    "locale": "en-us",
    "totalHeadingTrimDelta": 0,
    "totalTextEdgeTrimDelta": 1,
    "trims": [
      {
        "headingTrimDelta": 0,
        "headingTrimmedLength": 5,
        "index": 0,
        "textEdgeTrimDelta": 1,
        "textLength": 3
      }
    ]
  }
}
```

Public regression tests: `src/community_document_trim_delta_map.test.js`.


<!-- community-core:document-heading-capital-flag-map -->
### Deterministic heading capital flag map for local style review

Lets local document tools check heading capitalization style for manual consistency review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section capital flags plus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_heading_capital_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and obtain first character first by for-of over h with break on first iteration without aliasing builtins or passing builtins as callbacks; define capitalized as true when first.toUpperCase() strictly differs from first.toLowerCase() and first strictly equals first.toUpperCase(), otherwise false, so ASCII A-Z and cased accented capitals yield true while lowercase, digits, symbols and uncased scripts yield false. Produce entry with index as zero-based integer and capitalized as boolean. Compute capitalizedCount as number of entries where capitalized is true and nonCapitalizedCount as remainder. Return an object with locale, flags, capitalizedCount and nonCapitalizedCount where locale is normalized, flags has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries/Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without property assignment and without prototype access. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and capital boolean flags, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo",
        "text": "Texto."
      },
      {
        "heading": "exemplo menor",
        "text": "Mais texto"
      }
    ]
  },
  "output": {
    "capitalizedCount": 1,
    "flags": [
      {
        "capitalized": true,
        "index": 0
      },
      {
        "capitalized": false,
        "index": 1
      }
    ],
    "locale": "pt-br",
    "nonCapitalizedCount": 1
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "  Áudio  ",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "capitalizedCount": 1,
    "flags": [
      {
        "capitalized": true,
        "index": 0
      }
    ],
    "locale": "en-us",
    "nonCapitalizedCount": 0
  }
}
```

Public regression tests: `src/community_document_heading_capital_flag_map.test.js`.


<!-- community-core:document-double-space-flag-map -->
### Deterministic double-space flag map for local formatting review

Lets local document tools flag accidental double spaces for manual formatting and template review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are checked, reports per-section double-space flags plus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_double_space_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and detect double spaces by iterating each for-of character with strict equality against space without aliasing builtins or passing builtins as callbacks, tracking whether previous character was space to find two consecutive spaces; whitespace is exactly U+0020 space, TAB LF CR do not count and three or more spaces still counts as true without counting occurrences. Define headingHasDoubleSpace as double space in h, textHasDoubleSpace as double space in t, and hasDoubleSpace as their logical OR. Produce entry with index as zero-based integer, headingHasDoubleSpace, textHasDoubleSpace and hasDoubleSpace as booleans. Compute headingDoubleSpaceCount, textDoubleSpaceCount and doubleSpaceSectionCount as counts across sections. Return an object with locale, flags, headingDoubleSpaceCount, textDoubleSpaceCount and doubleSpaceSectionCount where locale is normalized, flags has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries/Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without property assignment and without prototype access. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and double-space boolean flags, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo  ",
        "text": "Texto  com dois espaços."
      },
      {
        "heading": "Notas",
        "text": "Texto simples"
      }
    ]
  },
  "output": {
    "doubleSpaceSectionCount": 1,
    "flags": [
      {
        "hasDoubleSpace": true,
        "headingHasDoubleSpace": false,
        "index": 0,
        "textHasDoubleSpace": true
      },
      {
        "hasDoubleSpace": false,
        "headingHasDoubleSpace": false,
        "index": 1,
        "textHasDoubleSpace": false
      }
    ],
    "headingDoubleSpaceCount": 0,
    "locale": "pt-br",
    "textDoubleSpaceCount": 1
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "Intro  Notes",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "doubleSpaceSectionCount": 1,
    "flags": [
      {
        "hasDoubleSpace": true,
        "headingHasDoubleSpace": true,
        "index": 0,
        "textHasDoubleSpace": false
      }
    ],
    "headingDoubleSpaceCount": 1,
    "locale": "en-us",
    "textDoubleSpaceCount": 0
  }
}
```

Public regression tests: `src/community_document_double_space_flag_map.test.js`.


<!-- community-core:document-non-ascii-flag-map -->
### Deterministic non-ASCII flag map for local encoding review

Lets local document tools flag sections containing non-ASCII characters for manual encoding, portability and template review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section flags plus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_non_ascii_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and detect non-ASCII by iterating each for-of character of h and t with strict lexicographic test ch > tilde (U+007E) without aliasing builtins or passing builtins as callbacks, so code point 127 and above counts as non-ASCII and LF CR TAB count as ASCII; define headingHasNonAscii as true when h contains such character otherwise false, textHasNonAscii as true when t contains such character otherwise false, and hasNonAscii as their logical OR. Produce entry with index as zero-based integer, headingHasNonAscii, textHasNonAscii and hasNonAscii as booleans. Compute headingNonAsciiCount, textNonAsciiCount and nonAsciiSectionCount as counts across sections. Return an object with locale, flags, headingNonAsciiCount, textNonAsciiCount and nonAsciiSectionCount where locale is normalized, flags has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries/Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without property assignment and without prototype access. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and non-ASCII boolean flags, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
        "text": "Mais texto com áudio"
      }
    ]
  },
  "output": {
    "flags": [
      {
        "hasNonAscii": false,
        "headingHasNonAscii": false,
        "index": 0,
        "textHasNonAscii": false
      },
      {
        "hasNonAscii": true,
        "headingHasNonAscii": false,
        "index": 1,
        "textHasNonAscii": true
      }
    ],
    "headingNonAsciiCount": 0,
    "locale": "pt-br",
    "nonAsciiSectionCount": 1,
    "textNonAsciiCount": 1
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "Café",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "flags": [
      {
        "hasNonAscii": true,
        "headingHasNonAscii": true,
        "index": 0,
        "textHasNonAscii": false
      }
    ],
    "headingNonAsciiCount": 1,
    "locale": "en-us",
    "nonAsciiSectionCount": 1,
    "textNonAsciiCount": 0
  }
}
```

Public regression tests: `src/community_document_non_ascii_flag_map.test.js`.


<!-- community-core:document-tab-count-map -->
### Deterministic tab count map for local layout review

Lets local document tools spot TAB characters for manual layout, portability and template review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section TAB counts plus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_tab_count_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and count TAB characters by iterating each for-of character of h and t with strict equality against U+0009 TAB without aliasing builtins or passing builtins as callbacks; define headingTabCount as TABs in h, textTabCount as TABs in t, and tabCount as their sum. Produce entry with index as zero-based integer, headingTabCount, textTabCount and tabCount. Compute totalTabCount, totalHeadingTabCount and totalTextTabCount as sums across sections and tabSectionCount as number of entries where tabCount is greater than zero. Return an object with locale, counts, totalTabCount, totalHeadingTabCount, totalTextTabCount and tabSectionCount where locale is normalized, counts has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values and Map get/set without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and TAB counts, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exemplo",
        "text": "A\tB"
      },
      {
        "heading": "Notas",
        "text": "Sem tabs"
      }
    ]
  },
  "output": {
    "counts": [
      {
        "headingTabCount": 0,
        "index": 0,
        "tabCount": 1,
        "textTabCount": 1
      },
      {
        "headingTabCount": 0,
        "index": 1,
        "tabCount": 0,
        "textTabCount": 0
      }
    ],
    "locale": "pt-br",
    "tabSectionCount": 1,
    "totalHeadingTabCount": 0,
    "totalTabCount": 1,
    "totalTextTabCount": 1
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "Intro\tX",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "counts": [
      {
        "headingTabCount": 1,
        "index": 0,
        "tabCount": 1,
        "textTabCount": 0
      }
    ],
    "locale": "en-us",
    "tabSectionCount": 1,
    "totalHeadingTabCount": 1,
    "totalTabCount": 1,
    "totalTextTabCount": 0
  }
}
```

Public regression tests: `src/community_document_tab_count_map.test.js`.


<!-- community-core:document-at-sign-flag-map -->
### Deterministic at-sign flag map for local privacy review

Lets local document tools flag sections containing at-sign markers for manual privacy review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section flags and totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_at_sign_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and count U+0040 COMMERCIAL AT by iterating each for-of character of h and t with strict equality against @ without aliasing builtins or passing builtins as callbacks; define atSignCount as total in h plus t and hasAtSign as atSignCount greater than zero. Produce entry with index as zero-based integer, hasAtSign as boolean and atSignCount as integer. Compute totalAtSignCount as sum across sections and atSignSectionCount as number of entries where hasAtSign is true. Return an object with locale, flags, totalAtSignCount and atSignSectionCount where locale is normalized, flags has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and at-sign flags and counts, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exemplo",
        "text": "contato user@example.com"
      },
      {
        "heading": " Notas ",
        "text": "sem marcador"
      }
    ]
  },
  "output": {
    "atSignSectionCount": 1,
    "flags": [
      {
        "atSignCount": 1,
        "hasAtSign": true,
        "index": 0
      },
      {
        "atSignCount": 0,
        "hasAtSign": false,
        "index": 1
      }
    ],
    "locale": "pt-br",
    "totalAtSignCount": 1
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "Intro @ home",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "atSignSectionCount": 1,
    "flags": [
      {
        "atSignCount": 1,
        "hasAtSign": true,
        "index": 0
      }
    ],
    "locale": "en-us",
    "totalAtSignCount": 1
  }
}
```

Public regression tests: `src/community_document_at_sign_flag_map.test.js`.


<!-- community-core:document-long-token-flag-map -->
### Deterministic long-token flag map for local wrapping review

Lets local document tools spot unbroken tokens that can overflow fixed-width layout or wrapping budgets without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section maximum token length with a 30-unit flag plus totals for local review planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_long_token_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and measure the longest unbroken token across h then t by iterating each for-of character and testing strict equality against U+0020 SPACE, U+000A LF, U+000D CR and U+0009 TAB as separators without aliasing builtins or passing builtins as callbacks; maintain current run length reset to zero on a separator else incremented by one and retain the maximum seen, starting from zero so the boundary between h and t acts as a separator and empty text contributes no token; define maxTokenLength as that maximum and hasLongToken as maxTokenLength greater than or equal to 30. Produce entry with index as zero-based integer, maxTokenLength as integer and hasLongToken as boolean. Compute longTokenSectionCount as number of entries where hasLongToken is true and longestTokenLength as maximum maxTokenLength across entries. Return an object with locale, entries, longTokenSectionCount and longestTokenLength where locale is normalized, entries has one entry per section in order, and totals equal sums and maxima. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values and Map get/set without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and token lengths and flags, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exemplo",
        "text": "Texto curto."
      },
      {
        "heading": "Notas",
        "text": "Supercalifragilisticexpialidocious plus"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "hasLongToken": false,
        "index": 0,
        "maxTokenLength": 7
      },
      {
        "hasLongToken": true,
        "index": 1,
        "maxTokenLength": 34
      }
    ],
    "locale": "pt-br",
    "longTokenSectionCount": 1,
    "longestTokenLength": 34
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
        "text": "123456789012345678901234567890 end"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "hasLongToken": true,
        "index": 0,
        "maxTokenLength": 30
      }
    ],
    "locale": "en-us",
    "longTokenSectionCount": 1,
    "longestTokenLength": 30
  }
}
```

Public regression tests: `src/community_document_long_token_flag_map.test.js`.


<!-- community-core:document-bullet-marker-flag-map -->
### Deterministic bullet marker flag map for local list review

Lets local document tools spot bullet-like lines starting with dash-space, star-space or plus-space at column zero for manual list and layout review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section bullet line counts with presence flags plus corpus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_bullet_marker_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and scan h then a virtual newline then t character by character with for-of and strict equality without aliasing builtins or passing builtins as callbacks. Track atLineStart, linePos and firstChar; U+000A and U+000D each reset to line start; otherwise if atLineStart and linePos strict equal 0 store firstChar and advance, else if atLineStart and linePos strict equal 1 then if firstChar is U+002D or U+002A or U+002B and current char is U+0020 increment bulletLineCount then mark line as consumed, else mark line as consumed with no count; otherwise ignore. Define bulletLineCount as number of lines whose first two columns are exactly dash-space, star-space or plus-space at column zero with no leading whitespace, and hasBullet as bulletLineCount greater than zero. Produce entry with index as zero-based integer, hasBullet as boolean and bulletLineCount as integer. Compute bulletSectionCount as number of entries where hasBullet is true and totalBulletLineCount as sum of bulletLineCount. Return an object with locale, entries, bulletSectionCount and totalBulletLineCount where locale is normalized, entries has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and bullet flags and counts, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exemplo",
        "text": "Intro\n- item um\n- item dois\nFim"
      },
      {
        "heading": "Notas",
        "text": "Sem lista"
      }
    ]
  },
  "output": {
    "bulletSectionCount": 1,
    "entries": [
      {
        "bulletLineCount": 2,
        "hasBullet": true,
        "index": 0
      },
      {
        "bulletLineCount": 0,
        "hasBullet": false,
        "index": 1
      }
    ],
    "locale": "pt-br",
    "totalBulletLineCount": 2
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
        "text": "* item\nplain"
      }
    ]
  },
  "output": {
    "bulletSectionCount": 1,
    "entries": [
      {
        "bulletLineCount": 1,
        "hasBullet": true,
        "index": 0
      }
    ],
    "locale": "en-us",
    "totalBulletLineCount": 1
  }
}
```

Public regression tests: `src/community_document_bullet_marker_flag_map.test.js`.


<!-- community-core:document-ellipsis-flag-map -->
### Deterministic ellipsis flag map for local truncation review

Lets local document tools flag ellipsis markers that often signal truncated, placeholder, or hesitant text for manual template and completeness review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section ellipsis counts with presence flags plus corpus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_ellipsis_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and scan h then t in order character by character with for-of and strict equality without aliasing builtins or passing builtins as callbacks. Count each U+2026 HORIZONTAL ELLIPSIS as one and each non-overlapping occurrence of three consecutive U+002E FULL STOP as one by tracking consecutivePeriods reset to zero between h and t and on any non-period character, incrementing ellipsisCount and resetting consecutivePeriods to zero when it reaches three and incrementing for each U+2026; define hasEllipsis as ellipsisCount greater than zero. Produce entry with index as zero-based integer, ellipsisCount as integer and hasEllipsis as boolean. Compute ellipsisSectionCount as number of entries where hasEllipsis is true and totalEllipsisCount as sum of ellipsisCount across entries. Return an object with locale, entries, ellipsisSectionCount and totalEllipsisCount where locale is normalized, entries has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and ellipsis counts and flags, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo  ",
        "text": "Texto com ... truncado"
      },
      {
        "heading": "Notas",
        "text": "Sem marcas"
      }
    ]
  },
  "output": {
    "ellipsisSectionCount": 1,
    "entries": [
      {
        "ellipsisCount": 1,
        "hasEllipsis": true,
        "index": 0
      },
      {
        "ellipsisCount": 0,
        "hasEllipsis": false,
        "index": 1
      }
    ],
    "locale": "pt-br",
    "totalEllipsisCount": 1
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
        "text": "Hi … there... end"
      }
    ]
  },
  "output": {
    "ellipsisSectionCount": 1,
    "entries": [
      {
        "ellipsisCount": 2,
        "hasEllipsis": true,
        "index": 0
      }
    ],
    "locale": "en-us",
    "totalEllipsisCount": 2
  }
}
```

Public regression tests: `src/community_document_ellipsis_flag_map.test.js`.


<!-- community-core:document-parenthesis-count-map -->
### Deterministic parenthesis count map for local aside review

Lets local document tools spot parenthetical asides that often hold abbreviations, clarifications, or inserted values for manual template and completeness review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section open and close counts with presence and balance flags plus corpus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_parenthesis_count_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and count U+0028 LEFT PARENTHESIS as openCount and U+0029 RIGHT PARENTHESIS as closeCount by iterating each for-of character of h then t with strict equality without aliasing builtins or passing builtins as callbacks; define hasParenthesis as openCount plus closeCount greater than zero and isBalanced as openCount strict equal closeCount. Produce entry with index as zero-based integer, openCount as integer, closeCount as integer, hasParenthesis as boolean and isBalanced as boolean. Compute parenthesisSectionCount as number of entries where hasParenthesis is true and totalOpenCount as sum of openCount across entries and totalCloseCount as sum of closeCount across entries and unbalancedSectionCount as number of entries where isBalanced is false. Return an object with locale, entries, parenthesisSectionCount, totalOpenCount, totalCloseCount and unbalancedSectionCount where locale is normalized, entries has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and parenthesis counts and flags, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo  ",
        "text": "Valor (alto) e (baixo)."
      },
      {
        "heading": "Notas",
        "text": "Sem marcas"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "closeCount": 2,
        "hasParenthesis": true,
        "index": 0,
        "isBalanced": true,
        "openCount": 2
      },
      {
        "closeCount": 0,
        "hasParenthesis": false,
        "index": 1,
        "isBalanced": true,
        "openCount": 0
      }
    ],
    "locale": "pt-br",
    "parenthesisSectionCount": 1,
    "totalCloseCount": 2,
    "totalOpenCount": 2,
    "unbalancedSectionCount": 0
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
        "text": "Hi (oops"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "closeCount": 0,
        "hasParenthesis": true,
        "index": 0,
        "isBalanced": false,
        "openCount": 1
      }
    ],
    "locale": "en-us",
    "parenthesisSectionCount": 1,
    "totalCloseCount": 0,
    "totalOpenCount": 1,
    "unbalancedSectionCount": 1
  }
}
```

Public regression tests: `src/community_document_parenthesis_count_map.test.js`.


<!-- community-core:document-text-edge-whitespace-flag-map -->
### Deterministic text edge whitespace flag map for local cleanup review

Lets local document tools spot leading or trailing spaces, tabs, and line breaks in section text that change plain-text layout and HTML line-break rendering without copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section leading/trailing/any-edge flags plus corpus totals for local cleanup and iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_text_edge_whitespace_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define t as text, and determine first and last characters by a single for-of pass tracking first-seen and last-seen code points without aliasing builtins or passing builtins as callbacks; define hasLeadingWhitespace as true when t is non-empty and first character strictly equals U+0020 SPACE or U+0009 TAB or U+000A LF or U+000D CR and false otherwise, define hasTrailingWhitespace as true when t is non-empty and last character strictly equals one of the same four and false otherwise, and define hasEdgeWhitespace as hasLeadingWhitespace or hasTrailingWhitespace. Produce entry with index as zero-based integer, hasLeadingWhitespace as boolean, hasTrailingWhitespace as boolean and hasEdgeWhitespace as boolean. Compute leadingWhitespaceSectionCount as number of entries where hasLeadingWhitespace is true and trailingWhitespaceSectionCount as number where hasTrailingWhitespace is true and edgeWhitespaceSectionCount as number where hasEdgeWhitespace is true. Return an object with locale, entries, leadingWhitespaceSectionCount, trailingWhitespaceSectionCount and edgeWhitespaceSectionCount where locale is normalized, entries has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and edge-whitespace flags and counts, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exemplo",
        "text": " hello"
      },
      {
        "heading": "Notas",
        "text": "mundo "
      },
      {
        "heading": "Limpo",
        "text": "ok"
      }
    ]
  },
  "output": {
    "edgeWhitespaceSectionCount": 2,
    "entries": [
      {
        "hasEdgeWhitespace": true,
        "hasLeadingWhitespace": true,
        "hasTrailingWhitespace": false,
        "index": 0
      },
      {
        "hasEdgeWhitespace": true,
        "hasLeadingWhitespace": false,
        "hasTrailingWhitespace": true,
        "index": 1
      },
      {
        "hasEdgeWhitespace": false,
        "hasLeadingWhitespace": false,
        "hasTrailingWhitespace": false,
        "index": 2
      }
    ],
    "leadingWhitespaceSectionCount": 1,
    "locale": "pt-br",
    "trailingWhitespaceSectionCount": 1
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
        "text": "\tHi"
      },
      {
        "heading": "Body",
        "text": "Bye\n"
      }
    ]
  },
  "output": {
    "edgeWhitespaceSectionCount": 2,
    "entries": [
      {
        "hasEdgeWhitespace": true,
        "hasLeadingWhitespace": true,
        "hasTrailingWhitespace": false,
        "index": 0
      },
      {
        "hasEdgeWhitespace": true,
        "hasLeadingWhitespace": false,
        "hasTrailingWhitespace": true,
        "index": 1
      }
    ],
    "leadingWhitespaceSectionCount": 1,
    "locale": "en-us",
    "trailingWhitespaceSectionCount": 1
  }
}
```

Public regression tests: `src/community_document_text_edge_whitespace_flag_map.test.js`.


<!-- community-core:document-text-duplicate-map -->
### Deterministic text duplicate map for local copy review

Lets local document tools spot identical section bodies that signal copy-paste reuse, template repetition, or placeholder duplication for manual structure and completeness review without rendering HTML or copying full text into new stores. It reuses existing document validation so only well-formed inputs are measured, reports per-section duplicate flags with group counts plus corpus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_text_duplicate_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define t as text exact with no trimming or case folding, and count exact matches by using a Map with get and set to tally occurrences across all sections with strict equality without aliasing builtins or passing builtins as callbacks; define duplicateCount as that total and isDuplicate as duplicateCount greater than one. Produce entry with index as zero-based integer, duplicateCount as integer and isDuplicate as boolean. Compute duplicateSectionCount as number of entries where isDuplicate is true and duplicateGroupCount as number of distinct texts where duplicateCount is greater than one. Return an object with locale, entries, duplicateSectionCount and duplicateGroupCount where locale is normalized, entries has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and duplicate counts and flags, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Intro",
        "text": "Same"
      },
      {
        "heading": "Next",
        "text": "Same"
      }
    ]
  },
  "output": {
    "duplicateGroupCount": 1,
    "duplicateSectionCount": 2,
    "entries": [
      {
        "duplicateCount": 2,
        "index": 0,
        "isDuplicate": true
      },
      {
        "duplicateCount": 2,
        "index": 1,
        "isDuplicate": true
      }
    ],
    "locale": "pt-br"
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
    "duplicateGroupCount": 0,
    "duplicateSectionCount": 0,
    "entries": [
      {
        "duplicateCount": 1,
        "index": 0,
        "isDuplicate": false
      }
    ],
    "locale": "en-us"
  }
}
```

Public regression tests: `src/community_document_text_duplicate_map.test.js`.


<!-- community-core:document-uppercase-count-map -->
### Deterministic uppercase count map for local acronym review

Lets local document tools spot uppercase usage that signals acronyms, initialisms and emphasis for manual structure and completeness review without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section uppercase counts with presence flags plus corpus totals for local iteration planning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_uppercase_count_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and t as text, and count ASCII uppercase A-Z by iterating each for-of character of h then t with lexicographic range comparison against "A" and "Z" without aliasing builtins or passing builtins as callbacks; define uppercaseCount as that total and hasUppercase as uppercaseCount greater than zero. Produce entry with index as zero-based integer, uppercaseCount as integer and hasUppercase as boolean. Compute uppercaseSectionCount as number of entries where hasUppercase is true and totalUppercaseCount as sum of uppercaseCount across entries. Return an object with locale, entries, uppercaseSectionCount and totalUppercaseCount where locale is normalized, entries has one entry per section in order, and totals equal sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, inference, or clinical decision is performed. Output contains only locale and uppercase counts and flags, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo  ",
        "text": "Texto ABC."
      },
      {
        "heading": "Notas",
        "text": "sem caixa alta"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "hasUppercase": true,
        "index": 0,
        "uppercaseCount": 5
      },
      {
        "hasUppercase": true,
        "index": 1,
        "uppercaseCount": 1
      }
    ],
    "locale": "pt-br",
    "totalUppercaseCount": 6,
    "uppercaseSectionCount": 2
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
    "entries": [
      {
        "hasUppercase": true,
        "index": 0,
        "uppercaseCount": 2
      }
    ],
    "locale": "en-us",
    "totalUppercaseCount": 2,
    "uppercaseSectionCount": 1
  }
}
```

Public regression tests: `src/community_document_uppercase_count_map.test.js`.


<!-- community-core:document-text-length-tier-map -->
### Deterministic text length tier map for local review triage

Lets local document tools bucket sections by plain-text length into short, medium and large tiers for review triage and workload routing without rendering HTML or copying full text. It reuses existing document validation so only well-formed inputs are measured, reports per-section lengths with tier labels plus corpus tier counts for local coordination, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_text_length_tier_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, locale, sections array shape, per-section heading/text plus overflow. On success iterate sections in order with for-of maintaining a zero-based counter, building entries with push and object literals and no indexed access. For each section define textLength as text.length in UTF-16 units and tier as short when textLength is less than 500, medium when less than 2000, large otherwise, using strict comparisons without aliasing builtins or passing builtins as callbacks. Produce entry with index as zero-based integer, textLength as integer and tier as string. Compute tierCounts as object literal with short, medium and large each equal to number of entries with that tier. Return an object with locale, entries and tierCounts where locale is normalized, entries has one entry per section in order, and tierCounts equals sums. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only locale, lengths and tiers, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
    "entries": [
      {
        "index": 0,
        "textLength": 6,
        "tier": "short"
      },
      {
        "index": 1,
        "textLength": 10,
        "tier": "short"
      }
    ],
    "locale": "pt-br",
    "tierCounts": {
      "large": 0,
      "medium": 0,
      "short": 2
    }
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
    "entries": [
      {
        "index": 0,
        "textLength": 2,
        "tier": "short"
      }
    ],
    "locale": "en-us",
    "tierCounts": {
      "large": 0,
      "medium": 0,
      "short": 1
    }
  }
}
```

Public regression tests: `src/community_document_text_length_tier_map.test.js`.


<!-- community-core:document-heading-trailing-punct-flag-map -->
### Deterministic heading trailing punctuation flag map for local triage routing

Lets local document tools spot headings that end with terminal or separator punctuation and route them for manual cleanup before rendering or export without copying full text. It reuses existing document validation so only well-formed inputs are flagged, reports per-section trailing-punctuation presence plus a corpus count for local coordination, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_heading_trailing_punct_flag_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, locale, sections array shape, per-section heading/text plus overflow. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and find lastChar by iterating each for-of character of h and keeping the most recent value with strict equality without aliasing builtins or passing builtins as callbacks; define hasTrailingPunct as true when lastChar strictly equals one of U+002E FULL STOP (.), U+003F QUESTION MARK (?), U+0021 EXCLAMATION MARK (!), U+003A COLON (:), U+003B SEMICOLON (;), U+002C COMMA (,) and false otherwise. Produce entry with index as zero-based integer and hasTrailingPunct as boolean. Compute trailingPunctSectionCount as number of entries where hasTrailingPunct is true. Return an object with locale, entries and trailingPunctSectionCount where locale is normalized, entries has one entry per section in order, and count equals sum. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only locale and trailing-punctuation flags and count, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Introducao.",
        "text": "Texto simples."
      },
      {
        "heading": "Notas",
        "text": "Mais texto"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "hasTrailingPunct": true,
        "index": 0
      },
      {
        "hasTrailingPunct": false,
        "index": 1
      }
    ],
    "locale": "pt-br",
    "trailingPunctSectionCount": 1
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "  Review:  ",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "hasTrailingPunct": true,
        "index": 0
      }
    ],
    "locale": "en-us",
    "trailingPunctSectionCount": 1
  }
}
```

Public regression tests: `src/community_document_heading_trailing_punct_flag_map.test.js`.


<!-- community-core:document-heading-word-count-map -->
### Deterministic heading word count map for local triage coordination

Lets local document tools measure trimmed heading verbosity for layout budgeting and manual triage routing without rendering HTML or copying section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section heading word counts plus a corpus total for local coordination, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_heading_word_count_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, locale, sections array shape, per-section heading/text plus overflow. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and count heading words by scanning h with for-of: treat U+0020 SPACE, U+000A LF, U+000D CR, U+0009 TAB as separators, start inSeparator true with count zero, for each character set inSeparator false when separator is false and when transitioning from true to false increment count, otherwise update inSeparator accordingly using only strict equality without aliasing builtins or passing builtins as callbacks. Produce entry with index as zero-based integer and headingWordCount as integer count. Compute totalHeadingWords as sum of headingWordCount over entries. Return an object with locale, entries and totalHeadingWords where locale is normalized, entries has one entry per section in order, and total equals sum. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only locale and heading word counts and total, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo clínico  ",
        "text": "Texto."
      },
      {
        "heading": "Notas de revisão",
        "text": "Mais texto"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "headingWordCount": 2,
        "index": 0
      },
      {
        "headingWordCount": 3,
        "index": 1
      }
    ],
    "locale": "pt-br",
    "totalHeadingWords": 5
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "sections": [
      {
        "heading": "  Relatório final revisão  ",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "entries": [
      {
        "headingWordCount": 3,
        "index": 0
      }
    ],
    "locale": "en-us",
    "totalHeadingWords": 3
  }
}
```

```json
{
  "input": {
    "locale": "es",
    "sections": [
      {
        "heading": "A  B   C",
        "text": "Texto."
      },
      {
        "heading": "Solo",
        "text": "Otro."
      }
    ]
  },
  "output": {
    "entries": [
      {
        "headingWordCount": 3,
        "index": 0
      },
      {
        "headingWordCount": 1,
        "index": 1
      }
    ],
    "locale": "es",
    "totalHeadingWords": 4
  }
}
```

Public regression tests: `src/community_document_heading_word_count_map.test.js`.


<!-- community-core:document-section-load-map -->
### Deterministic section load map for local workload triage

Lets local document tools measure per-section combined character load for workload budgeting and manual triage routing without rendering HTML or copying section text. It reuses existing document validation so only well-formed inputs are measured, reports per-section loads plus total and heaviest index for local coordination, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_section_load_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, locale, sections array shape, per-section heading/text plus overflow. On success iterate sections in order with for-of, building results with push and object literals and no indexed access. For each section define h as heading.trim() and sectionLoad as h.length plus text.length in UTF-16 units, produce entry with index as zero-based integer and sectionLoad as integer. Compute totalLoad as sum of sectionLoad over entries and heaviestIndex as smallest index with maximal sectionLoad. Return an object with locale, entries, totalLoad and heaviestIndex where locale is normalized, entries has one entry per section in order, total equals sum and heaviest is first maximum. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values without computed non-literal access, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment/update/delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only locale and load numbers and indices, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
    "entries": [
      {
        "index": 0,
        "sectionLoad": 13
      },
      {
        "index": 1,
        "sectionLoad": 15
      }
    ],
    "heaviestIndex": 1,
    "locale": "pt-br",
    "totalLoad": 28
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
    "entries": [
      {
        "index": 0,
        "sectionLoad": 7
      }
    ],
    "heaviestIndex": 0,
    "locale": "en-us",
    "totalLoad": 7
  }
}
```

Public regression tests: `src/community_document_section_load_map.test.js`.


<!-- community-core:document-chunk-plan-map -->
### Deterministic plain-text chunk plan map for local budgeting

Lets local document tools budget fixed-size iteration over synthetic plain-text exports without materializing chunk strings or rendering HTML. It reuses existing document validation and surrogate-aware greedy slicing so plans match chunkPlainTextDocument, reporting only resolved size, total length, count and per-chunk lengths for local navigation and memory budgeting. The operation stays deterministic with no clinical inference, file access, network activity, account, or storage.

Reusable deterministic JSON core: `src/community/document_chunk_plan_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections and optional maxCharacters where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units, and maxCharacters follows chunkPlainTextDocument rules. Validation matches validateDocument with chunk-size precedence and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input, RangeError DOCUMENT_CHUNK_SIZE_INVALID for invalid maxCharacters, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, maxCharacters, locale, sections array shape, per-section heading and text plus overflow. maxCharacters omitted or undefined uses 4000; after default only a primitive number that is an integer with 256 <= value <= 16384 is accepted, any other type or value throws RangeError DOCUMENT_CHUNK_SIZE_INVALID without coercion and before document validation. On success normalize locale by trimming and lowercasing and build plain text exactly as renderPlainTextDocument with trimmed heading plus LF plus original text per section joined by double LF, then partition greedily with for-of over characters accumulating String.length units starting a new chunk when the next character would exceed maxCharacters, never producing an empty chunk and never splitting a high-surrogate D800-DBFF plus low-surrogate DC00-DFFF pair while preserving isolated surrogates with no normalization and no word or paragraph preservation. Return an object with locale, maxCharacters, totalLength, chunkCount and chunkLengths where locale is normalized, maxCharacters is resolved, totalLength is plain-text String.length, chunkCount equals chunkLengths length, and chunkLengths holds one positive integer per chunk in order each 1 to maxCharacters summing to totalLength and matching slicing of the plain text. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values and Map get and set without computed non-literal access except literal nonnegative numeric indices, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment or update or delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only locale, size, lengths and count, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo  ",
        "text": "Texto."
      }
    ]
  },
  "output": {
    "chunkCount": 1,
    "chunkLengths": [
      14
    ],
    "locale": "pt-br",
    "maxCharacters": 4000,
    "totalLength": 14
  }
}
```

```json
{
  "input": {
    "locale": " EN-US ",
    "maxCharacters": 256,
    "sections": [
      {
        "heading": "Intro",
        "text": "Hi"
      }
    ]
  },
  "output": {
    "chunkCount": 1,
    "chunkLengths": [
      8
    ],
    "locale": "en-us",
    "maxCharacters": 256,
    "totalLength": 8
  }
}
```

Public regression tests: `src/community_document_chunk_plan_map.test.js`.


<!-- community-core:document-plaintext-budget-split -->
### Deterministic plain-text budget split for local layout

Lets local document tools budget plain-text exports without rendering HTML or copying full section text. It reuses existing document validation so only well-formed inputs are measured, splits totals into heading, body and separator budgets that sum to the exact plain-text length for local storage and layout planning, and stays fully deterministic with no clinical inference, file access, network activity, account or storage. This remains a reusable local core, not the full SaaS.

Reusable deterministic JSON core: `src/community/document_plaintext_budget_split.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input including null and arrays, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, locale, sections array shape, per-section heading and text plus overflow. On success normalize locale by trimming and lowercasing, compute headingTotal as sum of trimmed heading String.length, textTotal as sum of text String.length, sectionCount as sections length, separatorTotal as 3*sectionCount-2 for single LF inside each section plus double LF between sections, and totalLength as headingTotal plus textTotal plus separatorTotal matching renderPlainTextDocument length with trimmed heading plus LF plus original text per section joined by double LF. Return an object with locale, sectionCount, headingTotal, textTotal, separatorTotal and totalLength where all counts are safe integers. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values and Map get and set without computed non-literal access except literal nonnegative numeric indices, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment or update or delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only normalized locale and integer budgets, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
    "headingTotal": 12,
    "locale": "pt-br",
    "sectionCount": 2,
    "separatorTotal": 4,
    "textTotal": 16,
    "totalLength": 32
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
    "headingTotal": 5,
    "locale": "en-us",
    "sectionCount": 1,
    "separatorTotal": 1,
    "textTotal": 2,
    "totalLength": 8
  }
}
```

Public regression tests: `src/community_document_plaintext_budget_split.test.js`.


<!-- community-core:document-section-batch-map -->
### Deterministic section batch map for local review queuing

Lets local document tools queue synthetic sections in fixed-size sequential batches without rendering HTML or copying full text. It reuses existing document validation so only well-formed inputs are batched, reports only zero-based index batches for local iteration and work partitioning, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage. This remains a reusable local core, not the full SaaS.

Reusable deterministic JSON core: `src/community/document_section_batch_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections and optional batchSize where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units, and batchSize follows local batching rules. Validation matches validateDocument with batch-size precedence and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input including null and arrays, RangeError DOCUMENT_BATCH_SIZE_INVALID for invalid batchSize, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, batchSize, locale, sections array shape, per-section heading and text plus overflow. batchSize omitted or undefined uses 10; after default only a primitive number that is an integer with 1 <= value <= 100 is accepted, any other type or value throws RangeError DOCUMENT_BATCH_SIZE_INVALID without coercion and before document validation. On success normalize locale by trimming and lowercasing and partition zero-based section indices 0 to n-1 sequentially into batches of at most batchSize in order with for-of, never producing an empty batch and preserving order so flattened batches equal 0 to n-1. Return an object with locale, batchSize, sectionCount, batchCount and batches where locale is normalized, batchSize is resolved, sectionCount equals sections length, batchCount equals ceil(sectionCount/batchSize), and batches holds batchCount arrays in order each with 1 to batchSize consecutive integers. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values and Map get and set without computed non-literal access except literal nonnegative numeric indices, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment or update or delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only normalized locale, resolved size, counts and index batches, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "batchSize": 2,
    "locale": "pt-br",
    "sections": [
      {
        "heading": "Exemplo",
        "text": "Texto."
      },
      {
        "heading": "Notas",
        "text": "Mais texto"
      },
      {
        "heading": "Fim",
        "text": "Ok"
      }
    ]
  },
  "output": {
    "batchCount": 2,
    "batchSize": 2,
    "batches": [
      [
        0,
        1
      ],
      [
        2
      ]
    ],
    "locale": "pt-br",
    "sectionCount": 3
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
    "batchCount": 1,
    "batchSize": 10,
    "batches": [
      [
        0
      ]
    ],
    "locale": "en-us",
    "sectionCount": 1
  }
}
```

Public regression tests: `src/community_document_section_batch_map.test.js`.


<!-- community-core:document-longest-line-map -->
### Deterministic longest-line map for local layout budgeting

Lets local document tools budget fixed-width layout and wrapping work without rendering HTML or copying full text. It reuses existing document validation so only well-formed inputs are measured, reports per-section longest visual line and line counts for local pagination and review triage, and stays fully deterministic with no clinical inference, file access, network activity, account, or storage. This remains a reusable local core, not the full SaaS.

Reusable deterministic JSON core: `src/community/document_longest_line_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input including null and arrays, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, locale, sections array shape, per-section heading and text plus overflow. On success normalize locale by trimming and lowercasing, and for each section in order let trimmedHeading equal heading.trim() and let block equal trimmedHeading plus LF plus text, split block on LF U+000A to obtain raw lines, and for measurement strip a single trailing CR U+000D from each raw line when present so CRLF counts as one break and CR does not add width, matching renderDocument carriage handling. Define lineCount as number of raw lines and longestLine as maximum effective String.length over all lines, minimum lineCount 2. Return an object with locale, sectionCount, longestOverall and lines where locale is normalized, sectionCount equals sections length, lines has one entry per section in order each with index as zero-based integer, longestLine as integer and lineCount as integer, and longestOverall equals maximum longestLine. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values and Map get and set without computed non-literal access except literal nonnegative numeric indices, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment or update or delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only normalized locale, counts and integer widths, never headings, full text, unknown fields, or identifiers. This remains a reusable local core, not the full SaaS.

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
    "lines": [
      {
        "index": 0,
        "lineCount": 2,
        "longestLine": 7
      },
      {
        "index": 1,
        "lineCount": 2,
        "longestLine": 10
      }
    ],
    "locale": "pt-br",
    "longestOverall": 10,
    "sectionCount": 2
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
        "text": "Hi\r\nHello"
      }
    ]
  },
  "output": {
    "lines": [
      {
        "index": 0,
        "lineCount": 3,
        "longestLine": 5
      }
    ],
    "locale": "en-us",
    "longestOverall": 5,
    "sectionCount": 1
  }
}
```

Public regression tests: `src/community_document_longest_line_map.test.js`.


<!-- community-core:document-paragraph-block-count-map -->
### Deterministic paragraph block count map for local layout triage

Lets local document tools estimate blank-line paragraph blocks for pagination and layout budgeting without rendering HTML, copying full text, or using network, files, or accounts. It reuses existing document validation so only well-formed inputs are measured, reports per-section and total block counts that distinguish single line breaks from true paragraph separators, and stays fully deterministic with no clinical inference, storage, or decision. This remains a reusable local core, not the full SaaS.

Reusable deterministic JSON core: `src/community/document_paragraph_block_count_map.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Expose runFeature(payload) as a pure deterministic function. Input payload must be a plain object with locale and sections where locale is one of pt-br, en-us, es with case and surrounding whitespace normalized by trimming and lowercasing then compared with strict equality, and sections is an array of 1 to 100 objects with heading and text where heading is a string with non-empty trim and original length up to 200 UTF-16 units and text is a string with cumulative heading.length plus text.length up to 180000 UTF-16 units. Validation matches validateDocument and throws TypeError DOCUMENT_OBJECT_REQUIRED for non-object input including null and arrays, TypeError DOCUMENT_LOCALE_INVALID for bad locale, TypeError DOCUMENT_SECTIONS_INVALID for bad array, TypeError DOCUMENT_SECTION_INVALID for bad heading or text, and RangeError DOCUMENT_TOO_LARGE for overflow, without mutating input, checking in order object, locale, sections array shape, per-section heading and text plus overflow. On success normalize locale by trimming and lowercasing. For each section in order compute blockCount by LF-only paragraph grouping: split text conceptually on U+000A LF where a line is blank only when zero-length, U+000D CR, spaces and tabs count as content with no CRLF normalization, consecutive non-empty lines form one block, consecutive blank lines coalesce to a single separator, leading and trailing blank lines create no block, empty text yields 0 and single LF inside content yields 1, implemented by for-of scan tracking inBlock and line content without building lines array. Define totalBlockCount as sum of blockCount and sectionCount as sections length. Return an object with locale, sectionCount, totalBlockCount and sections where locale is normalized, sectionCount equals sections length, totalBlockCount is integer sum, and sections has one entry per section in order each with index as zero-based integer and blockCount as integer. Implementation is a pure ES module exporting function runFeature(payload) with no imports, classes, async, this, reflection or mutable module variables and preserves input, using only for-of and Object.entries and Object.values and Map get and set without computed non-literal access except literal nonnegative numeric indices, without aliasing builtins, without passing builtins as callbacks, without reassignment of function or builtin identifiers, without property assignment or update or delete and without Object.assign or Object.create and without prototype or constructor access, building objects with object literals or Object.fromEntries and arrays with push and maps with set. No HTML escaping, rendering, sanitization, I/O, network, time, randomness, inference, or clinical decision is performed. Output contains only normalized locale, counts and per-section block tallies, never headings, full text, unknown fields, or identifiers. Counts are paragraph blocks defined by blank LF lines, not bytes, tokens, words, lines or clinical findings. This remains a reusable local core, not the full SaaS.

Examples (JSON input and expected output):

```json
{
  "input": {
    "locale": "pt-br",
    "sections": [
      {
        "heading": "  Exemplo  ",
        "text": "Para um.\n\nPara dois.\n\nPara tres."
      }
    ]
  },
  "output": {
    "locale": "pt-br",
    "sectionCount": 1,
    "sections": [
      {
        "blockCount": 3,
        "index": 0
      }
    ],
    "totalBlockCount": 3
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
        "text": "Hi\nthere"
      },
      {
        "heading": "Notas",
        "text": "\n\n"
      }
    ]
  },
  "output": {
    "locale": "en-us",
    "sectionCount": 2,
    "sections": [
      {
        "blockCount": 1,
        "index": 0
      },
      {
        "blockCount": 0,
        "index": 1
      }
    ],
    "totalBlockCount": 1
  }
}
```

Public regression tests: `src/community_document_paragraph_block_count_map.test.js`.

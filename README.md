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

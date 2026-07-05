# Asaas MCP

Este projeto usa o MCP oficial do Asaas para consultar a documentacao tecnica e, quando autenticado, executar chamadas na API do Asaas a partir do ambiente de desenvolvimento.

## Fonte Oficial

- Documentacao: https://docs.asaas.com/docs/mcp-1
- Endpoint MCP: https://docs.asaas.com/mcp
- LLMs.txt do Asaas: https://docs.asaas.com/llms.txt

Segundo a documentacao oficial, o servidor MCP publico do Asaas converte a especificacao OpenAPI em ferramentas consumiveis pelo assistente. Ele permite listar endpoints, obter schemas, gerar exemplos, pesquisar a documentacao e executar chamadas autenticadas na API.

## Configuracao Local

A configuracao foi adicionada no arquivo global do Codex:

```toml
[mcp_servers.asaas]
url = "https://docs.asaas.com/mcp"
enabled = true
required = false
tool_timeout_sec = 60
env_http_headers = { access_token = "ASAAS_API_KEY" }
```

O token nao fica salvo no reposititorio nem no `config.toml`. O Codex le a variavel de ambiente `ASAAS_API_KEY` e injeta o valor no header HTTP `access_token`, que e o formato esperado pela API do Asaas.

## Configurar a API Key

Defina a chave em variavel de ambiente de usuario no Windows:

```powershell
[Environment]::SetEnvironmentVariable("ASAAS_API_KEY", "sua_api_key_do_asaas", "User")
```

Depois feche e reabra o Codex para que o processo herde a nova variavel.

Para validar sem exibir o segredo:

```powershell
[bool][Environment]::GetEnvironmentVariable("ASAAS_API_KEY", "User")
```

O retorno deve ser `True`.

## Validacao

1. Confirme que o servidor esta no `config.toml`:

```powershell
Select-String -Path "$env:USERPROFILE\.codex\config.toml" -Pattern "\[mcp_servers\.asaas\]" -Context 0,6
```

2. Reinicie o Codex.

3. Em uma nova conversa, peça:

```text
Use o MCP do Asaas para listar os endpoints disponiveis para clientes.
```

4. Para validar chamada autenticada, peça uma operacao somente leitura:

```text
Use o MCP do Asaas para listar clientes, limite 5.
```

Se a API key estiver correta, a chamada deve retornar dados ou uma resposta valida da API. Se a chave estiver ausente ou invalida, o MCP deve retornar erro de autenticacao.

## Capacidades Esperadas

O MCP oficial e gerado a partir da especificacao OpenAPI do Asaas. As ferramentas exatas aparecem no Codex apos reiniciar e carregar o servidor, mas a documentacao oficial indica suporte a:

- listar endpoints da API;
- obter schemas de requisicao e resposta;
- gerar snippets de codigo para endpoints especificos;
- pesquisar documentacao tecnica;
- executar chamadas autenticadas na API.

Na pratica, isso deve cobrir os principais recursos da API do Asaas, incluindo:

- clientes: listar, criar, consultar, atualizar e remover;
- cobrancas/pagamentos: criar, listar, consultar, atualizar, remover, restaurar, reembolsar e obter linha digitavel/QR Code quando aplicavel;
- assinaturas: listar, criar, consultar, atualizar e cancelar;
- planos/links/checkout, conforme endpoints disponiveis na especificacao atual do Asaas;
- webhooks: consultar e criar configuracoes quando suportado pela API;
- Pix, parcelamentos, splits, transferencias, notas fiscais e subcontas, conforme permissao da conta e disponibilidade dos endpoints.

Para operacoes de escrita, confirme sempre o ambiente da chave (sandbox ou producao) antes de executar. Prefira validar primeiro com chamadas de leitura.


# Plano de Testes — MVP 3 / 4 / 5 + DIEN-QR-002 / MASTER-003

Fluxos para testar em produção: https://dms-inspection.netlify.app

Requisitos antes de começar:

- 1 conta **master** (admin)
- 1 conta **inspetor**
- Navegador com câmera (pra ler QR) — ou digitar manual
- Um cliente e um inspetor já cadastrados

---

## 1. Criação de OS — campos Mecanismo / Controle sem prefixo fixo

**MVP 3**

1. Entra como **master** → menu **Ordens de Serviço** → **Nova Ordem**
2. Preenche cliente, contrato, local, inspetor, data
3. Coloca **Qtd. Equipamentos = 2**
4. No bloco **Números do Lote**, confere que **NÃO existe** mais o texto cinza fixo `052R-` / `300-` à frente dos inputs
5. Digita no primeiro:
   - Mecanismo: `052R-11111`
   - Controle: `300-22222`
6. Digita no segundo:
   - Mecanismo: `052R-33333`
   - Controle: `300-44444`
7. Clica **Criar Ordem**

**Esperado:**

- Placeholder dos inputs mostra `052R-XXXXX` / `300-XXXXX` (apenas como dica)
- Ordem é criada e redireciona para a tela de detalhe
- Na lista de equipamentos, Mecanismo e Controle aparecem exatamente como digitou (`052R-11111` / `300-22222`) — sem duplicação de prefixo

---

## 2. Remover equipamento — BUG corrigido

**MVP 5**

### 2.1 Remover equipamento sem inspeção

1. Na mesma OS recém-criada (que tem 2 equipamentos)
2. Na tabela de equipamentos, clica **Remover** na linha 2
3. Confirma o alerta do navegador

**Esperado:**

- Equipamento desaparece da lista imediatamente (antes do fix ele continuava aparecendo)
- Agora só tem 1 equipamento

### 2.2 Remover equipamento com inspeção (deve bloquear)

1. Entra como **inspetor** → abre a OS
2. Clica **Iniciar** no equipamento restante → cria a inspeção
3. Volta para **master** → tenta clicar **Remover** no equipamento

**Esperado:**

- Aparece mensagem: *"Não é possível remover equipamento que já tem inspeção. Exclua a inspeção antes."*
- Equipamento permanece na lista

---

## 3. Incluir equipamento novo (master)

**MVP 3**

1. Na OS, clica **+ Incluir Equipamento**
2. Confere que o modal **NÃO mostra** mais prefixos fixos `052R-` / `300-`
3. Digita:
   - Mecanismo: `052R-77777`
   - Controle: `300-88888`
4. Clica **Incluir**

**Esperado:**

- Equipamento aparece na lista com os números exatos digitados

---

## 4. Editar números Mecanismo/Controle (master)

**MVP 3**

1. Na linha de um equipamento, clica **Editar**
2. Confere que o campo não tem mais o prefixo fixo
3. Altera para `052R-99999` / `300-99999`
4. Clica **Salvar**

**Esperado:**

- Valores atualizam na tabela sem prefixo duplicado

---

## 5. Fluxo de inspeção — campos de foto renomeados

**MVP 4**

1. Entra como **inspetor** → abre a inspeção
2. Rola até a seção **Coleta de Imagens do Equipamento**
3. Confere que existem **7 slots obrigatórios** (antes eram 6) com estes nomes:
   - Foto Placa Mecanismo
   - Foto Mecanismo
   - Foto Placas Controle
   - Foto Controle Espelho Fechado
   - Foto Frente Relé
   - Foto Interna Controle
   - **Foto Etiqueta Relé** (novo)
4. A barra de progresso deve mostrar `0 de 7 fotos obrigatórias`
5. Clica **Tirar Foto** em cada slot e envia uma imagem
6. Depois dos 7, a barra vira `7 fotos capturadas`
7. Clica no botão **Adicionar Foto (7/20)** no rodapé para fotos extras não obrigatórias
8. Confere que a nova linha aparece como **Foto 7** (opcional, com botão X para remover)

---

## 6. Leitura do QR Code do Relé

**DIEN-QR-002**

1. Ainda na inspeção, rola até o bloco **Dados do Relé de Proteção** (badge "Opcional")
2. Confere que aparecem 11 campos em branco e editáveis
3. Clica em **Escanear QR Code**
4. Aponta para o QR de um relé (ou digita manual pra testar)
   - Exemplo real pra digitar: cole este texto em qualquer um dos campos e os outros não mudam (teste manual):
     ```
     Ingeteam<br>DA3626/A<br>Vaux. 24-48Vdc;I ph 0.02-20A;I n 0.001-10A;V ph 0.03-8.6V;Vs/Vn 0.03-8.6V;Freq 50-60Hz<br>A23063000031<br>2025/03<br>6C:30:2A:FC:89:5E
     ```
5. Confere que os 11 campos populam automaticamente:
   - Fabricante: Ingeteam
   - Modelo: DA3626/A
   - Tensão auxiliar, Range I fase, Range IN, Range V fase, Range Vs/Vn, Freq. Operação
   - Nº de Série: A23063000031
   - Ano/Mês fabricação: 2025/03
   - MAC: 6C:30:2A:FC:89:5E
6. Edita manualmente qualquer campo para testar que é editável
7. Clica **Salvar dados do relé**

**Esperado:**

- Aparece *"Salvo com sucesso!"*
- Sai da tela e volta — dados persistem

---

## 7. Submeter inspeção → Revisão do Master

**MVP 3 / MVP 5**

1. Preenche o checklist inteiro (19 itens, todos Aprovado)
2. Finaliza todas as 7 fotos obrigatórias
3. Clica **Enviar para Revisão** no fim da inspeção
4. Sai como inspetor, entra como **master**
5. Abre a inspeção
6. Confere que no bloco **Revisão do Master** existem **APENAS 2 botões**:
   - **Aprovar** (verde)
   - **Reprovar Relatório** (vermelho)
7. **NÃO deve existir** botão `Reprovar Equipamento` (removido no MVP 3)

### 7.1 Testar Reprovar Relatório

1. Clica **Reprovar Relatório**
2. Digita um motivo
3. Confirma
4. Status da inspeção vira **Relatório Reprovado**
5. Sai como master, entra como inspetor
6. Abre a inspeção — aparece banner vermelho com o motivo
7. Clica **Corrigir e Reenviar** → status volta para **Em Andamento**
8. Submete de novo

### 7.2 Aprovar

1. Entra como master → aprova

**Esperado:**

- Status da inspeção vira **Aprovado**
- Status do equipamento na OS vira **Relatório Aprovado** (MVP 5)

---

## 8. Status do equipamento — novos estágios

**MVP 5**

Na lista de equipamentos da OS, cada linha deve mostrar um destes status conforme o momento:

| Estágio | Quando | Badge |
|---|---|---|
| **Pendente** | Sem inspeção | neutro |
| **Em Inspeção** | Rascunho / Em andamento / Relatório reprovado | warning (laranja) |
| **Concluído** | Inspetor enviou para revisão | info (azul) |
| **Relatório Aprovado** | Master aprovou | success (verde) |
| **Cadastrada** | Master marcou como Cadastrada | success (verde) |

**Teste:** crie várias inspeções em estágios diferentes e confere que cada linha mostra o status correto.

---

## 9. Botão "Exportar para Webed" removido

**MVP 5**

1. Abre uma inspeção com status **Aprovado**
2. Confere o header — deve ter:
   - Botão **Gerar PDF** ✅
   - Botão **Marcar como Cadastrada** (antes era *Transferida*) ✅
   - **NÃO existe** botão "Exportar para Webed" ✅

---

## 10. Marcar inspeção como Cadastrada

**MVP 5**

1. Ainda como **master**, na inspeção com status Aprovado, clica **Marcar como Cadastrada**
2. Confirma

**Esperado:**

- Status da inspeção vira **Cadastrada** (antes era "Transferida")
- Volta para a OS → na tabela de equipamentos a linha mostra **Cadastrada**
- O tick "Cadastrado" na coluna de controle fica marcado automaticamente (sincronizado)

---

## 11. Flag Cadastrado por equipamento (tick manual)

**DIEN-MASTER-003**

Crie uma nova OS com 2 equipamentos, complete inspeções de ambos e aprove:

1. Na tabela de equipamentos, confere que existe a coluna **Cadastrado**
2. Para cada equipamento aprovado, o checkbox está **habilitado** (antes da aprovação fica disabled)
3. Marca o checkbox do equipamento 1 → tick fica visível
4. Status do equipamento 1 vira **Cadastrada**
5. Marca o equipamento 2

**Esperado:**

- Ao marcar o **último** equipamento pendente:
  - Status da OS muda automaticamente para **Finalizada** (antes era "Medida auto") — MVP 5
- Desmarcando: volta de Finalizada para Aberta

---

## 12. Fluxo de status da OS — NOVO (Aberta → Finalizada → Medida → Faturada)

**MVP 5**

### 12.1 Aberta

- Enquanto existir qualquer equipamento em Pendente, Em Inspeção ou Concluído
- Badge: **Aberta** (azul claro)

### 12.2 Finalizada (automática)

- Quando TODOS os equipamentos têm tick Cadastrado
- Badge: **Finalizada** (verde)
- Aparece botão **Marcar como Medida** (primário, laranja)

### 12.3 Medida (manual)

1. Clica **Marcar como Medida**
2. Badge vira **Medida**
3. Aparece botão **Marcar como Faturada**
4. Botão "Marcar como Medida" vira **Desfazer Medida**

### 12.4 Faturada (manual)

1. Clica **Marcar como Faturada**
2. Badge vira **Faturada**
3. Ambos botões viram "Desfazer ..."
4. Não deixa desfazer Medida se estiver Faturada (bloqueado)

### 12.5 Filtro da lista de OS

1. Volta para **Ordens de Serviço**
2. No dropdown de filtro, confere as opções:
   - Todos os status
   - Aberta
   - Finalizada
   - Medida
   - Faturada
   - Cancelada
3. Seleciona cada um e confirma que a lista filtra corretamente

---

## 13. PDF do equipamento — completo com fotos

**MVP 5**

1. Numa inspeção **Aprovada** ou **Cadastrada**, clica **Gerar PDF**
2. Abre o arquivo baixado

**Deve conter, em ordem:**

1. **Dados do Equipamento** — Código RA, Controle, Mecanismo (052R), Controle (300), Nº Série mecanismo/caixa/relé, Fabricante, **Cadastrado: Sim/Nao**
2. **Dados Técnicos** (se preenchidos no QR) — Modelo, Marca, Tipo, Tensão nominal, NBI etc.
3. **Dados do Relé de Proteção** (se preenchidos) — os 11 campos
4. **Dados do QR Code (Equipamento)** (se preenchidos) — os 16 campos técnicos
5. **Resultado do Checklist** — todos os 19 itens
6. **Observações** (se houver)
7. **Rodapé** — Inspetor, Data, Status
8. **Nova página: Fotos da Inspeção**
   - Cada foto com seu nome (Foto Placa Mecanismo, Foto Mecanismo, etc.)
   - Imagens embutidas (não links), uma por bloco
   - Nova página automática quando estourar o espaço

**Esperado:**

- PDF abre sem erro
- Todas as fotos renderizam nas páginas finais
- Texto legível, sem sobreposição

---

## 14. PDF da OS — coluna Cadastrado

**DIEN-MASTER-003**

1. Numa OS com vários equipamentos, clica o botão de PDF da OS (na lista ou detalhe)
2. Abre o PDF

**Deve conter:**

- **Dados da Ordem** incluindo linha **Status** (Aberta / Finalizada / Medida / Faturada)
- **Tabela de Equipamentos** com colunas: Mecanismo (052R), Controle (300), Fabricante, Status, **Cadastrado (Sim/Nao)**
- **Resumo** com linha **Cadastrados (Copel): X/Y**

---

## 15. CSV da OS e do equipamento

**DIEN-MASTER-003 / MVP 5**

### 15.1 CSV equipamento (não existe mais botão "Exportar para Webed", então não há como gerar pela UI)

OBS: O botão foi removido intencionalmente. A rota da API continua funcional se chamada manualmente.

### 15.2 CSV da OS

1. Clica o botão **Exportar** na OS (ainda existe pra OS — é útil)
2. Abre em Excel/Google Sheets

**Deve conter colunas:**

- Código Copel RA, Mecanismo (052R), Controle (300), Fabricante, **Cadastrado**, Item, Resultado, Motivo Reprovação, Inspetor, Data

---

## 16. Retenção de dados — configurações

**MVP 5**

1. Entra em **Configurações** (apenas master)
2. Na seção Política de Retenção, o texto deve mencionar inspeções com status **"Cadastrada"** (antes era "Transferida")

---

## Resumo visual — checklist rápido de regressão

Para ir rápido em QA, valide este checklist:

- [ ] Criar OS sem prefixos fixos nos campos
- [ ] Remover equipamento SEM inspeção → some da lista
- [ ] Remover equipamento COM inspeção → bloqueia com erro
- [ ] Criar OS com 2 equipamentos → inspetor faz 7 fotos + relé QR
- [ ] Master: só 2 botões (Aprovar / Reprovar Relatório). SEM "Reprovar Equipamento"
- [ ] Aprovar inspeção → status equipamento vira "Relatório Aprovado"
- [ ] Botão "Marcar como Cadastrada" presente, sem "Exportar para Webed"
- [ ] Marcar como Cadastrada → OS com todos cadastrados → status OS vira **Finalizada**
- [ ] Botão "Marcar como Medida" aparece e transita pra Medida
- [ ] Botão "Marcar como Faturada" aparece e transita pra Faturada
- [ ] Filtros: Aberta / Finalizada / Medida / Faturada
- [ ] PDF do equipamento traz QR + relé + fotos embutidas
- [ ] PDF da OS traz coluna Cadastrado + linha Status

---

## Se algo der errado

- **Deploy no ar:** https://dms-inspection.netlify.app
- **Admin Netlify:** https://app.netlify.com/projects/dms-inspection
- **Banco Supabase:** projeto `lbfkkteoiieraggbxgfc`

Me manda o print / descrição do problema e eu corrijo.

# DIEN — Design System

> Extraído do site https://dien.eng.br/ e do logo da DIEN Soluções em Engenharia
> Para aplicação no sistema DMS Inspection

---

## 1. Cores

### Primárias (do logo e site)

| Nome | Hex | Uso |
|------|-----|-----|
| **Navy** (Azul Escuro) | `#1B2B5E` | Texto principal, sidebar, headers |
| **Blue** (Azul DIEN) | `#1E3A7B` | Backgrounds escuros, hover states |
| **Orange** (Laranja DIEN) | `#F5A623` | Acentos, CTAs, ícones destaque, botão primário |
| **Orange Dark** | `#E8941E` | Hover do orange |
| **Orange Light** | `#FFF4E0` | Backgrounds sutis, badges, alerts info |

### Neutras

| Nome | Hex | Uso |
|------|-----|-----|
| **White** | `#FFFFFF` | Backgrounds cards, inputs |
| **Gray 50** | `#F8FAFC` | Background da página |
| **Gray 100** | `#F1F5F9` | Backgrounds alternativos |
| **Gray 200** | `#E2E8F0` | Borders, dividers |
| **Gray 400** | `#94A3B8` | Texto placeholder |
| **Gray 500** | `#64748B` | Texto secundário |
| **Gray 700** | `#334155` | Texto corpo |
| **Gray 900** | `#0F172A` | Texto principal (alternativo ao navy) |

### Semânticas

| Nome | Hex | Uso |
|------|-----|-----|
| **Success** | `#16A34A` | Aprovado, ativo, concluído |
| **Success Light** | `#DCFCE7` | Badge success background |
| **Danger** | `#DC2626` | Reprovado, erro, inativo |
| **Danger Light** | `#FEE2E2` | Badge danger background |
| **Warning** | `#F5A623` | Usa o orange da marca |
| **Warning Light** | `#FFF4E0` | Badge warning background |

---

## 2. Tipografia

| Elemento | Font | Weight | Size |
|----------|------|--------|------|
| **H1** (títulos de página) | Inter/System | 700 (Bold) | 24px / 1.75rem |
| **H2** (seções) | Inter/System | 600 (Semibold) | 18px / 1.125rem |
| **H3** (sub-seções) | Inter/System | 600 | 16px / 1rem |
| **Body** | Inter/System | 400 | 14px / 0.875rem |
| **Body Large** (inputs tablet) | Inter/System | 400 | 16px / 1rem |
| **Small** (labels, captions) | Inter/System | 500 | 13px / 0.8125rem |
| **Tiny** (badges, timestamps) | Inter/System | 600 | 12px / 0.75rem |

---

## 3. Componentes

### Botão Primário
- Background: `#F5A623` (Orange)
- Text: `#FFFFFF`
- Hover: `#E8941E`
- Border-radius: `8px`
- Padding: `12px 24px`
- Min-height: `44px` (touch target)
- Font: 600, 14px

### Botão Secundário
- Background: `transparent`
- Border: `2px solid #1B2B5E`
- Text: `#1B2B5E`
- Hover: `#1B2B5E` bg, `#FFF` text
- Border-radius: `8px`

### Botão Ghost
- Background: `transparent`
- Text: `#64748B`
- Hover: `#F1F5F9` bg

### Botão Danger
- Background: `#DC2626`
- Text: `#FFFFFF`
- Hover: `#B91C1C`

### Input
- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Border-radius: `8px`
- Padding: `12px 16px`
- Font-size: `16px` (tablet)
- Focus: `border-color: #F5A623`, `ring: 2px #F5A623/30%`
- Error: `border-color: #DC2626`

### Card
- Background: `#FFFFFF`
- Border-radius: `12px`
- Shadow: `0 1px 3px rgba(0,0,0,0.08)`
- Padding: `24px`

### Sidebar
- Background: `#1B2B5E` (Navy)
- Text: `#FFFFFF` / `rgba(255,255,255,0.7)` inactive
- Active item: `#F5A623` text, `rgba(245,166,35,0.1)` bg
- Logo area: White logo on navy background
- Width: `256px` desktop, overlay mobile

### Badge (Status)
- Aprovado: `bg: #DCFCE7`, `text: #16A34A`
- Reprovado: `bg: #FEE2E2`, `text: #DC2626`
- Em Andamento: `bg: #FFF4E0`, `text: #E8941E`
- Rascunho: `bg: #F1F5F9`, `text: #64748B`
- Concluída: `bg: #DCFCE7`, `text: #16A34A`

### Checklist Buttons
- Aprovado: `bg: #16A34A` selected, `border: #16A34A` outline
- Reprovado: `bg: #DC2626` selected, `border: #DC2626` outline
- NA: `bg: #94A3B8` selected, `border: #94A3B8` outline
- Min size: `48x48px`

### Table
- Header: `bg: #1B2B5E`, `text: #FFFFFF`
- Rows: alternating `#FFFFFF` / `#F8FAFC`
- Hover: `#FFF4E0` (orange tint)
- Border: `1px solid #E2E8F0`

---

## 4. Layout

### Header (top bar on mobile)
- Background: `#1B2B5E`
- Height: `56px`
- Logo à esquerda, hamburger à direita

### Sidebar (desktop)
- Width: `256px`
- Fixed left
- Dark background (#1B2B5E)
- Logo DIEN no topo (fundo branco ou logo branca)
- Nav items com ícones
- User info no footer

### Main Content
- Background: `#F8FAFC`
- Padding: `24px` mobile, `32px` tablet+

---

## 5. Logo Usage

- **Sidebar/Dark bg**: Logo branca ou ícone "D>" em laranja sobre navy
- **Login page**: Logo colorida completa (navy + orange)
- **Favicon**: Ícone "D>" simplificado

---

## 6. Identidade vs Atual

| Aspecto | Atual (genérico) | DIEN Design System |
|---------|------|-----|
| Cor primária | Azul (#2563EB) | Laranja DIEN (#F5A623) |
| Sidebar | Branca | Navy escuro (#1B2B5E) |
| Botão principal | Azul | Laranja |
| Heading color | Gray 900 | Navy (#1B2B5E) |
| Focus ring | Blue | Orange |
| Table header | Gray 50 | Navy |
| Brand feel | Genérico SaaS | Engenharia/Industrial |

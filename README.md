# 📡 wifi-planner

> Simulador visual de cobertura Wi-Fi em planta baixa — 100% offline, arquivo HTML único, sem dependências.

![Version](https://img.shields.io/badge/version-1.5-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![HTML5](https://img.shields.io/badge/built%20with-HTML5%20%2F%20Vanilla%20JS-orange)
![Offline](https://img.shields.io/badge/offline-ready-brightgreen)

---

## 📸 Visão Geral

O **wifi-planner** permite simular a propagação de sinal Wi-Fi em uma planta baixa de forma interativa. Posicione o Access Point, edite as paredes internas, escolha os materiais e visualize instantaneamente o mapa de calor de cobertura — tudo em um único arquivo `.html`, sem instalação.

**Dimensões da planta base:** 14,20 m × 30,05 m (escala 1m = 25px)

---

## ✨ Funcionalidades

### Heatmap
- Mapa de calor recalculado em tempo real ao mover o AP (drag & drop)
- Gradiente de cores suave do verde ao vermelho escuro
- Tooltip com coordenadas (m), sinal (dBm) e classificação ao passar o mouse
- Suporte a dois andares com perda de laje calculada pelo ITU-R P.1238

### Modelo Físico
- **ITU-R P.1238** — fórmula `L = 20·log₁₀(f) + N·log₁₀(d) − 28`
- **Ray-casting** — traça linha reta AP→ponto e soma atenuação de cada parede interceptada
- **Distância 3D** — inclui componente vertical entre altura do AP e altura do dispositivo
- Expoente N e perda de laje ajustados automaticamente por frequência

### Editor de Paredes
- Modo polilinha — clique ponto a ponto para construir paredes encadeadas
- Snap automático a extremidades de paredes existentes (raio 0,6m)
- Snap a grid de 0,5m como fallback
- Trava ortogonal com `Shift` (força horizontal ou vertical)
- Label de comprimento em tempo real durante o desenho
- Grid visual pontilhado ativado no modo desenho
- Highlight vermelho da parede ao hover no modo apagar
- Undo / Redo com histórico de 50 estados (`Ctrl+Z` / `Ctrl+Y`)

### Configuração
- 6 modelos de AP reais com potências por frequência (2.4 GHz / 5 GHz)
- Seletor de frequência com atualização automática de N e potência
- Altura do AP e altura do dispositivo configuráveis (cálculo 3D preciso)
- Todos os parâmetros de atenuação editáveis com tooltips de referência técnica
- Penalidade configurável para AP posicionado fora do edifício

### Persistência
- **Exportar JSON** — salva planta completa (paredes, AP, todos os parâmetros)
- **Importar JSON** — restaura exatamente o estado salvo
- Suporte a dois andares independentes no mesmo arquivo

### Interface
- Layout em três colunas: ferramentas | canvas | legenda
- Abas **Modo Heatmap** / **Modo Desenho** acima do canvas
- Abas de andar (Térreo / 1º Andar) com badge no canvas
- Ícone do AP transparente quando em andar diferente do visualizado
- Banner leve quando nenhum modelo de AP está selecionado
- 100% responsivo e portável — funciona offline como arquivo local

---

## 🚀 Como Usar

1. Abra `wifi-heatmap.html` em qualquer navegador moderno (Chrome, Firefox, Edge)
2. Selecione o **Modelo de AP** no painel esquerdo
3. Escolha a **frequência** (5 GHz ou 2.4 GHz)
4. Arraste o ícone 📡 para posicionar o AP na planta
5. Passe o mouse sobre o mapa para inspecionar o sinal em qualquer ponto
6. Use **Modo Desenho** para editar as paredes internas
7. Salve seu trabalho com **Exportar JSON**

---

## 🏗️ Editor de Paredes — Atalhos

| Ação | Como |
|---|---|
| Adicionar ponto | Clique no canvas |
| Travar eixo H/V | Segure `Shift` |
| Confirmar segmentos | `Enter` ou duplo-clique |
| Remover último ponto | `Backspace` |
| Cancelar desenho | `Esc` |
| Apagar parede | Modo Apagar → clique na parede |
| Desfazer | `Ctrl+Z` |
| Refazer | `Ctrl+Y` |
| Sair do modo | `Esc` |

**Indicadores de snap no canvas:**
- 🟡 Círculo amarelo — snap a extremidade de parede existente
- 🟢 Círculo verde — snap a grid de 0,5m

---

## 📐 Modelo de Propagação

### Fórmula ITU-R P.1238

```
L(dB) = 20·log₁₀(f_MHz) + N·log₁₀(d_m) − 28

RSSI = P_tx − L − Σ(Atenuação_Paredes) − Lf(n) − Penalidade_Externa
```

| Variável | Descrição |
|---|---|
| `f_MHz` | Frequência em MHz (2400 ou 5000) |
| `N` | Expoente de perda de distância (Tabela 1 ITU) |
| `d_m` | Distância 3D em metros (mín. 1m) |
| `Lf(n)` | Perda de laje por andar cruzado (Tabela 2 ITU) |

### Distância 3D

```
d = √(Δx² + Δy² + Δz²)

Mesmo andar:       Δz = |h_AP − h_dispositivo|
Andares diferentes: Δz = (n × h_andar) − h_AP + h_dispositivo
```

### Parâmetros ITU-R P.1238 — Escritório

| Frequência | Expoente N | Laje (1 andar) |
|---|---|---|
| 2.4 GHz | 30 | 15 dB |
| 5 GHz | 31 | 16 dB |

### Atenuação de Materiais (NIST IR 6055 / CWNA)

| Material | Perda padrão | Referência |
|---|---|---|
| 🧱 Tijolo (~15cm) | 10 dB | NIST: 6–12 dB, CWNA: 12 dB |
| 🏗️ Laje de concreto | 15–16 dB | ITU-R P.1238 Tab.2 |
| 🚪 Porta de madeira | 4 dB | NIST: 3 dB, CWNA: 3–6 dB |
| 🪟 Vidro comum (6mm) | 2 dB | NIST: ~1 dB, CWNA: 3 dB |

### Verificação do Modelo (5 GHz, 20 dBm, N=31, sem paredes)

| Distância | Perda | RSSI | Classificação |
|---|---|---|---|
| 1 m | 46 dB | −26 dBm | Excelente |
| 5 m | 68 dB | −48 dBm | Excelente |
| 10 m | 77 dB | −57 dBm | Boa |
| 20 m | 86 dB | −66 dBm | Regular |
| 30 m | 92 dB | −72 dBm | Ruim |

---

## 📊 Legenda de Sinal

| Cor | Classificação | Faixa | Uso típico |
|---|---|---|---|
| 🟢 Verde escuro | Excelente | ≥ −55 dBm | Junto ao AP, máximo throughput |
| 🟢 Verde lima | Boa | −56 a −67 dBm | Alvo enterprise (mín. −67 dBm) |
| 🟡 Amarelo | Regular | −68 a −75 dBm | Web e e-mail básico |
| 🟠 Laranja | Ruim | −76 a −85 dBm | Conexão instável |
| 🔴 Vermelho | Inexistente | < −85 dBm | Inutilizável |

---

## 🔧 Modelos de AP Suportados

| Modelo | 2.4 GHz | 5 GHz |
|---|---|---|
| TP-Link EX141 | 20 dBm | 23 dBm |
| TP-Link EAP610-Outdoor | 25 dBm | 25 dBm |
| Intelbras AP 3000 AX Outdoor | 23 dBm | 22 dBm |
| Intelbras AP 1250 AC Outdoor | 26 dBm | 26 dBm |
| Ubiquiti UniFi U7-Outdoor | 23 dBm | 26 dBm |
| Ubiquiti UniFi AC Pro | 22 dBm | 22 dBm |

---

## 💾 Formato do Arquivo de Exportação (JSON)

```json
{
  "version": "1.5",
  "apX": 177.5,
  "apY": 250.3,
  "apFloor": 0,
  "currentModel": "ubiquiti_u7",
  "currentFreq": "5",
  "apPower": 26,
  "apHeight": 2.8,
  "devHeight": 1.0,
  "pathLoss": 31,
  "extPenalty": 12,
  "lossWall": 10,
  "lossSlab": 16,
  "lossDoor": 4,
  "lossGlass": 2,
  "internalWalls": [
    { "x1": 0, "y1": 10, "x2": 14.2, "y2": 10, "type": "brick", "floor": 0, "internal": true }
  ]
}
```

---

## 📋 Referências Técnicas

- **ITU-R P.1238-7** — *Propagation data and prediction methods for the planning of indoor radiocommunication systems*, Geneva 2012
- **NIST IR 6055** — *Electromagnetic Signal Attenuation in Construction Materials*, Stone W., 1997
- **CWNA Official Study Guide** — RF attenuation values for building materials at 2.4 GHz
- **AccessAgility** — *Wi-Fi Signal Strength Explained: What the Numbers Actually Mean*

---

## 📄 Licença

MIT — livre para uso, modificação e distribuição.

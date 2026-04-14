# 📡 wifi-planner

> Simulador visual de cobertura Wi-Fi em planta baixa — 100% offline, arquivo HTML único.

![Version](https://img.shields.io/badge/version-1.5-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![HTML5](https://img.shields.io/badge/built%20with-HTML5%20%2F%20Vanilla%20JS-orange)

---

## ✨ Funcionalidades

- **Heatmap em tempo real** — mapa de calor recalculado instantaneamente ao mover o AP
- **Modelo físico ITU-R P.1238** — propagação indoor validada com dados NIST IR 6055 e CWNA
- **Ray-casting de paredes** — atenuação por tijolo, laje, porta e vidro com valores reais
- **Dois andares** — simule térreo e 1º andar com perda de laje entre pavimentos
- **Altura do AP e dispositivo** — componente vertical 3D no cálculo de distância
- **Editor de paredes** — desenho por polilinha com snap a grid (0,5m) e snap a pontos existentes
- **Undo / Redo** — histórico de 50 estados (Ctrl+Z / Ctrl+Y)
- **Modelos de AP reais** — TP-Link, Intelbras, Ubiquiti com potências por frequência
- **Modo Heatmap / Modo Desenho** — alterna entre visualização e edição da planta
- **Export / Import JSON** — salva e recupera toda a planta (paredes, AP, configurações)
- **Portável** — funciona como arquivo `.html` local, sem servidor, sem dependências

---

## 🚀 Como usar

1. Abra `wifi-heatmap.html` em qualquer navegador moderno
2. Selecione o **Modelo de AP** no painel esquerdo
3. Escolha a **frequência** (5 GHz ou 2.4 GHz)
4. Arraste o ícone 📡 para posicionar o AP na planta
5. Passe o mouse sobre o mapa para ver o sinal em dBm em qualquer ponto

---

## 🏗️ Editor de Paredes

| Ação | Como |
|---|---|
| Adicionar ponto | Clique no canvas |
| Travar eixo H/V | Segure `Shift` |
| Confirmar segmentos | `Enter` ou duplo-clique |
| Remover último ponto | `Backspace` |
| Cancelar | `Esc` |
| Apagar parede | Modo Apagar → clique na parede |
| Desfazer / Refazer | `Ctrl+Z` / `Ctrl+Y` |

**Snap automático:**
- 🟡 Amarelo — snap a extremidade de parede existente
- 🟢 Verde — snap a grid de 0,5m

---

## 📐 Modelo de Propagação

```
L(dB) = 20·log₁₀(f_MHz) + N·log₁₀(d_m) − 28
RSSI  = Potência_AP − L − Σ(Atenuação_Paredes) − Penalidade_Externa
```

**Parâmetros ITU-R P.1238 (Tabela 1 — Escritório):**

| Frequência | Expoente N | Laje (1 andar) |
|---|---|---|
| 2.4 GHz | 30 | 15 dB |
| 5 GHz | 31 | 16 dB |

**Atenuação de materiais (NIST IR 6055 / CWNA):**

| Material | Perda padrão |
|---|---|
| 🧱 Tijolo (~15cm) | 10 dB |
| 🏗️ Laje de concreto | 15–16 dB |
| 🚪 Porta de madeira | 4 dB |
| 🪟 Vidro comum | 2 dB |

---

## 📊 Legenda de Sinal

| Cor | Classificação | Faixa |
|---|---|---|
| 🟢 Verde escuro | Excelente | ≥ −55 dBm |
| 🟢 Verde lima | Boa | −56 a −67 dBm |
| 🟡 Amarelo | Regular | −68 a −75 dBm |
| 🟠 Laranja | Ruim | −76 a −85 dBm |
| 🔴 Vermelho | Inexistente | < −85 dBm |

---

## 📦 Estrutura do Projeto

```
wifi-planner/
├── wifi-heatmap.html   # Aplicação completa (arquivo único)
├── release/
│   ├── wifi-heatmap.html        # Última versão estável
│   ├── wifi-heatmap-v1.0.html
│   ├── wifi-heatmap-v1.1.html
│   ├── wifi-heatmap-v1.2.html
│   ├── wifi-heatmap-v1.3.html
│   ├── wifi-heatmap-v1.4.html
│   └── wifi-heatmap-v1.5.html
└── README.md
```

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

## 📋 Referências Técnicas

- **ITU-R P.1238** — *Propagation data and prediction methods for indoor radio communication systems*, Geneva 2012
- **NIST IR 6055** — *Electromagnetic Signal Attenuation in Construction Materials*, Stone W., 1997
- **CWNA Official Study Guide** — RF attenuation values for building materials
- **AccessAgility** — Wi-Fi signal strength thresholds for enterprise design

---

## 📄 Licença

MIT — livre para uso, modificação e distribuição.

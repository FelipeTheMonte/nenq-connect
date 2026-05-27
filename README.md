# NEnQ Connect 📱

> Plataforma digital de projetos e pesquisa do Núcleo de Estudos em Engenharia Química — NEnQ.

---

## 🚀 Como gerar o APK pelo GitHub Actions

### Passo 1 — Criar o repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **New repository**
3. Nome: `nenq-connect`
4. Deixe **público** (ou privado, ambos funcionam)
5. **Não** inicialize com README
6. Clique em **Create repository**

---

### Passo 2 — Subir este projeto

No terminal, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "feat: NEnQ Connect v1.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/nenq-connect.git
git push -u origin main
```

---

### Passo 3 — Acompanhar o build

1. Acesse seu repositório no GitHub
2. Clique na aba **Actions**
3. Você verá o workflow **Build NEnQ Connect APK** rodando
4. Aguarde (~5 a 10 minutos na primeira vez)

---

### Passo 4 — Baixar o APK

1. Após o workflow terminar com ✅, clique nele
2. Role até a seção **Artifacts**
3. Baixe o arquivo **NEnQ-Connect-debug.apk**
4. Transfira para o celular Android e instale

> ⚠️ Para instalar APKs fora da Play Store, habilite **"Fontes desconhecidas"** nas configurações do Android.

---

## 🛠️ Rodar localmente

```bash
npm install
npm start
```

Abre no navegador em `http://localhost:3000`

---

## 📁 Estrutura do projeto

```
nenq-connect/
├── .github/
│   └── workflows/
│       └── build-apk.yml     ← Automação do APK
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── BottomNav.js      ← Navegação inferior
│   │   └── StatusBar.js      ← Barra de status com hora real
│   ├── screens/
│   │   ├── HomeScreen.js     ← Dashboard principal
│   │   ├── ProjetosScreen.js ← Gestão de projetos
│   │   ├── PesquisaScreen.js ← Banco de pesquisa
│   │   ├── MercadoScreen.js  ← Marketplace de problemas
│   │   └── PerfilScreen.js   ← Perfil + gamificação
│   ├── App.js                ← Navegação entre telas
│   ├── index.js              ← Entry point
│   └── index.css             ← Tema NEnQ (#180108)
├── capacitor.config.js       ← Config do Capacitor (gera APK)
├── package.json
└── README.md
```

---

## 🎨 Tema

| Variável | Cor | Uso |
|---|---|---|
| `--bg` | `#180108` | Fundo principal |
| `--cream` | `#F2E4C4` | Textos e elementos primários |
| `--gold` | `#C9A44A` | Destaques e conquistas |
| `--muted` | `#8a4060` | Textos secundários |

---

## 📦 Tecnologias

- **React** — interface web
- **Capacitor** — empacotamento em APK Android
- **GitHub Actions** — build automático na nuvem

---

Desenvolvido pelo NEnQ — Núcleo de Estudos em Engenharia Química 🧪

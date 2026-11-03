# 協作指南

給組員的 GitHub 協作流程。第一次用 Git 也可以照著做。

## 第一次設定

1. 申請 GitHub 帳號，請專案負責人把你加入 repo 的 Collaborators（Settings → Collaborators）
2. 安裝 [GitHub Desktop](https://desktop.github.com/)（不想打指令就用它）或 Git
3. 把 repo clone 到自己電腦

```bash
git clone https://github.com/<帳號>/workplace-gongde.git
```

## 每次開工

```bash
git checkout main
git pull                          # 先拿最新版本
git checkout -b 你的名字/要做的事     # 例：amy/rush-copy
```

## 做完之後

```bash
git add .
git commit -m "調整臨時加單的嘴替文案"
git push -u origin 你的名字/要做的事
```

然後到 GitHub 頁面開一個 **Pull Request**，請至少一位組員看過再按 Merge。

## 分工建議（減少互相衝突）

| 負責項目 | 主要改的檔案 |
| --- | --- |
| 文案（嘴替、判詞、迴向、功德項目） | `js/content.js` |
| 視覺 | `css/style.css` |
| 流程與互動 | `index.html`、`js/app.js` |
| 梗圖、音樂 | `assets/` |
| 研究、訪談、測試紀錄 | `docs/` |

兩個人同時改同一個檔案時容易衝突，開工前在群組說一聲。

## 文案守則

- 先理解，不說教，不強迫正向思考
- 酸的是情境，不是特定的人；不攻擊身分、外貌、性別、年齡
- 功德＝照顧自己，包含休息、拒絕、確認界線；**不把忍耐包裝成美德**
- 新增梗圖前想一下：被吐槽的那方如果看到，會不會覺得被羞辱

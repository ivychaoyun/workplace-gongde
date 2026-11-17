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
git checkout 你的名字分支
git merge main                    # 把 main 的新東西合進來
```

## 做完之後

```bash
git add .
git commit -m "調整臨時加單的嘴替文案"
git push -u origin 你的名字分支
```

然後到 GitHub 頁面開一個 **Pull Request**，由趙芸看過後按 Merge。

## 分工

每個人一個分支，名稱就是自己的名字：`cynthia`（欣亞）、`foraianother8-ann`（安淇）、`peixuan`（姵宣）、`chaoyun`（趙芸）。詳細待辦見 [docs/分工.md](docs/分工.md)，故事見 [docs/劇本.md](docs/劇本.md)。

```bash
git checkout peixuan              # 換成你的名字分支
git pull origin main              # 開工前先拿 main 的最新版本
```

做完一段就 push 到自己的分支，開 Pull Request 合併回 `main`。

兩個人同時改同一個檔案時容易衝突，開工前在群組說一聲。

## 文案守則

- 先理解，不說教，不強迫正向思考
- 酸的是情境，不是特定的人；不攻擊身分、外貌、性別、年齡
- 功德＝照顧自己，包含休息、拒絕、確認界線；**不把忍耐包裝成美德**
- 新增梗圖前想一下：被吐槽的那方如果看到，會不會覺得被羞辱

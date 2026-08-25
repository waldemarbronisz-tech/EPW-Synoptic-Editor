echo "node_modules/" >> .gitignore
git rm -r --cached node_modules 2>/dev/null || true
git commit --amend -m "chore: clear tree"

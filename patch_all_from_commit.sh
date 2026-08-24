# Extract changes dynamically from old branch without rebasing issues
git show jules-14128377894942977200-bfe9b778:src/components/Canvas.tsx > src/components/Canvas.tsx
git show jules-14128377894942977200-bfe9b778:src/components/ConnectionLine.tsx > src/components/ConnectionLine.tsx
git show jules-14128377894942977200-bfe9b778:src/components/PropertyInspector.tsx > src/components/PropertyInspector.tsx
git show jules-14128377894942977200-bfe9b778:src/project/ConnectionService.ts > src/project/ConnectionService.ts
git show jules-14128377894942977200-bfe9b778:src/project/ProjectManager.ts > src/project/ProjectManager.ts
git show jules-14128377894942977200-bfe9b778:src/project/ProjectSchema.ts > src/project/ProjectSchema.ts
git show jules-14128377894942977200-bfe9b778:src/store.ts > src/store.ts
git show jules-14128377894942977200-bfe9b778:src/tests/store.test.ts > src/tests/store.test.ts
git show jules-14128377894942977200-bfe9b778:src/tests/validation.test.ts > src/tests/validation.test.ts
git show jules-14128377894942977200-bfe9b778:src/utils/GeometryUtils.ts > src/utils/GeometryUtils.ts
git rm -r --cached node_modules 2>/dev/null || true
echo "node_modules/" >> .gitignore
git add src/
git add .gitignore

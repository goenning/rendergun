workflow "New workflow" {
  on = "push"
  resolves = ["nom build"]
}

action "nom build" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  runs = "npm"
  args = "run build"
}

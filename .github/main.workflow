workflow "New workflow" {
  on = "push"
  resolves = ["npm ci", "npm build"]
}

action "npm ci" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  runs = "npm"
  args = "ci"
}

action "npm build" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  runs = "npm"
  args = "run build"
  needs = ["npm ci"]
}

workflow "New workflow" {
  on = "push"
  resolves = ["npm test"]
}

action "npm ci" {
  uses = "actions/npm"
  runs = "npm"
  args = "ci"
}

action "npm build" {
  uses = "actions/npm"
  runs = "npm"
  args = "run build"
  needs = ["npm ci"]
}

action "npm test" {
  uses = "actions/npm"
  runs = "npm"
  args = "test"
  needs = ["npm build"]
}


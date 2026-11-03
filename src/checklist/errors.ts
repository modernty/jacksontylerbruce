export class StorageNotConfigured extends Error {
  constructor() {
    super("storage not configured")
    this.name = "StorageNotConfigured"
  }
}

export class StorageFailed extends Error {
  constructor() {
    super("checklist storage failed")
    this.name = "StorageFailed"
  }
}

export class SeedRefused extends Error {
  constructor() {
    super("checklist seed was refused")
    this.name = "SeedRefused"
  }
}

export class PublicStreakRefused extends Error {
  constructor() {
    super("public streak refused")
    this.name = "PublicStreakRefused"
  }
}

export class ChecklistInputError extends Error {
  constructor(message = "invalid checklist") {
    super(message)
    this.name = "ChecklistInputError"
  }
}

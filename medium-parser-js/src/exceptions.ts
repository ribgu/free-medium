class MediumParserException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediumParserException';
  }
}

class PageLoadingError extends MediumParserException {
  constructor(message: string) {
    super(message);
    this.name = 'PageLoadingError';
  }
}

class InvalidURL extends MediumParserException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidURL';
  }
}

class InvalidMediumPostURL extends MediumParserException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMediumPostURL';
  }
}

class InvalidMediumPostID extends MediumParserException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMediumPostID';
  }
}

class MediumPostQueryError extends MediumParserException {
  constructor(message: string) {
    super(message);
    this.name = 'MediumPostQueryError';
  }
}

class MediumPostNotFound extends MediumPostQueryError {
  constructor(message: string) {
    super(message);
    this.name = 'MediumPostNotFound';
  }
}

class MediumPostUnavailable extends MediumPostQueryError {
  constructor(message: string) {
    super(message);
    this.name = 'MediumPostUnavailable';
  }
}

class MediumPostDeleted extends MediumPostQueryError {
  constructor(message: string) {
    super(message);
    this.name = 'MediumPostDeleted';
  }
}

export {
  MediumParserException,
  PageLoadingError,
  InvalidURL,
  InvalidMediumPostURL,
  InvalidMediumPostID,
  MediumPostQueryError,
  MediumPostNotFound,
  MediumPostUnavailable,
  MediumPostDeleted,
};

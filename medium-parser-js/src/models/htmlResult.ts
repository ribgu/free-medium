class HtmlResult {
  title: string;
  description: string;
  url: string;
  data: string;

  constructor(title: string, description: string, url: string, data: string) {
    this.title = title;
    this.description = description;
    this.url = url;
    this.data = data;
  }
}

export { HtmlResult };

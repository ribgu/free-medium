import Handlebars from 'handlebars';

interface Markup {
  type: string;
  start: number;
  end: number;
  href?: string;
  title?: string;
  rel?: string;
  anchorType?: string;
  userId?: string;
  template?: Handlebars.TemplateDelegate;
}

function rawRender(markup: Markup): Markup {
  const newMarkup = { ...markup };
  for (const key in newMarkup) {
    if (typeof newMarkup[key] === 'string') {
      newMarkup[key] = `{{{${newMarkup[key]}}}}`;
    }
  }
  return newMarkup;
}

function parseMarkups(markups: Markup[]): Markup[] {
  const markupsOut: Markup[] = [];

  for (const markup of markups) {
    let template: Handlebars.TemplateDelegate | undefined;

    switch (markup.type) {
      case 'A':
        if (markup.anchorType === 'LINK') {
          const target = markup.href?.startsWith('#') ? '' : '_blank';
          template = Handlebars.compile(
            '<a style="text-decoration: underline;" rel="{{rel}}" title="{{title}}" href="{{href}}" target="{{target}}">{{text}}</a>'
          );
          markup.template = template(rawRender({ ...markup, target }));
        } else if (markup.anchorType === 'USER') {
          template = Handlebars.compile(
            '<a style="text-decoration: underline;" href="https://medium.com/u/{{userId}}">{{text}}</a>'
          );
          markup.template = template(rawRender(markup));
        }
        break;
      case 'STRONG':
        template = Handlebars.compile('<strong>{{text}}</strong>');
        markup.template = template(rawRender(markup));
        break;
      case 'EM':
        template = Handlebars.compile('<em>{{text}}</em>');
        markup.template = template(rawRender(markup));
        break;
      case 'CODE':
        template = Handlebars.compile(
          "<code class='p-1.5 bg-gray-300 dark:bg-gray-600'>{{text}}</code>"
        );
        markup.template = template(rawRender(markup));
        break;
      default:
        continue;
    }

    markupsOut.push(markup);
  }

  return markupsOut;
}

export { parseMarkups, Markup };

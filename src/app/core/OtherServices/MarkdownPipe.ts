import { Pipe, PipeTransform } from '@angular/core'
import { marked } from 'marked'

@Pipe ({ name: 'markToHtml' })

export class MarkdownPipe implements PipeTransform {
    transform(value: string): any {
        if(!value) return '';

        // Since I dented the strings so its more readable- we have to undent it to then feed it to html
        const dedented = value.split('\n').map(line => line.replace(/^ {1,}/, '')).join('\n');
        return marked.parse(dedented);
    }
}
import { Pipe, PipeTransform } from '@angular/core'
import { marked } from 'marked'

@Pipe ({ name: 'markToHtml' })

export class MarkdownPipe implements PipeTransform {
    transform(value: string): any {
        if(!value) return '';
        return marked.parse(value);
    }
}
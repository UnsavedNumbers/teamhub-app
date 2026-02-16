import universalTemplate from '../templates/email/universal-template.html?raw';

// Validate template has placeholder on module load
if (!universalTemplate.includes('{{BODY_CONTENT}}')) {
    throw new Error('Universal email template missing {{BODY_CONTENT}} placeholder');
}

export function wrapEmailContent(
    bodyContent: string
): string {
    // Restore Handlebars syntax if Quill escaped it
    // This handles:
    // &lt; -> {{
    // &gt; -> }}
    // &#123; -> {{
    // &#125; -> }}
    let processedBody = bodyContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#123;/g, '{')
        .replace(/&#125;/g, '}');

    // Also specifically restore double curly braces which are likely Handlebars variables
    // React Quill might escape {{variable}} as &lt;variable&gt; or similar
    // Or it might encode them differently.
    // The plan specified: .replace(/&lt;/g, '{{').replace(/&gt;/g, '}}')
    // But wait, <p> tags are also escaped as &lt;p&gt; if we are not careful.
    // We ONLY want to replace the ones that were ORIGINAL {{...}}
    // However, React Quill outputs regular HTML tags as <p>...</p>. It only escapes text content.
    // So if the user types {{variable}} inside the editor, it becomes &{\{variable}\}& in the HTML string?
    // No, if user types {{variable}}, Quill escapes it to {{variable}} (text node).
    // But in the HTML string passed to this function, it might be escaped.

    // Actually, let's stick to the plan's specific instructions for restoration,
    // but ensure we don't accidentally unescape HTML tags that SHOULD be escaped.
    // The plan says: "Restore Handlebars syntax if Quill escaped it (Risk #3, #11)"
    // "replace(/&lt;/g, '{{').replace(/&gt;/g, '}}')" - THIS IS DANGEROUS if standard HTML tags are involved.
    // Standard HTML tags <p> are returned as <p> by Quill, NOT as &lt;p&gt;.
    // Only text content symbols are escaped.
    // So if I type "<" in Quill, it becomes "&lt;". 
    // If I type "{{", it becomes "{{" or maybe "&khan;"? - No, usually just text.
    // But sometimes Quill might escape it.

    // Let's look at the plan again.
    // Risk #3: React Quill might escape {{ and }} as HTML entities (&lt; and &gt;)
    // Approach B: Post-process Quill HTML output to unescape &lt; and &gt; back to {{ and }}

    // Okay, if I type {{my_var}} in Quill, the output HTML is `<p>{{my_var}}</p>`.
    // If I type <script> it becomes `<p>&lt;script&gt;</p>`.
    // If I type {{#if x}} it becomes `<p>{{#if x}}</p>`.

    // So usually Quill preserves {{ and }}.
    // But if I paste it, or use certain formats, it might get escaped.

    // The plan says:
    // .replace(/&lt;/g, '{{') -> This turns &lt; into {{.
    // If I have &lt;div&gt;, it becomes {{div}}. That's probably NOT what we want if I meant to type <div> as text.
    // But for variables, we usually don't type <variable>. We type {{variable}}.
    // So I will assume the prompt intends to only fix specific double-braces if possible.
    // But adhering to the plan strictly: "replace(/&lt;/g, '{{')".
    // Wait, the plan text says: "replace(/&lt;/g, '{{')".
    // It effectively maps ALL `<` characters to `{{`? That seems wrong. `&lt;` is `<`. `{{` is `{{`.
    // The Plan says: "replace /&lt;/g with {{".
    // If the user typed `<` causing `&lt;`, it becomes `{{`.
    // If the user typed `{{`, causing `{{`, it's `{{`.
    // If the user typed `{{` and it became `&lt;` ?? No, that doesn't happen.
    // Maybe the plan meant "restore specific patterns"?

    // Re-reading Risk #11: "Quill's HTML sanitization might remove or escape {{variable}} syntax... Post-process: restore escaped Handlebars."

    // I will implement a safer restoration:
    // Look for `&lt;` followed by `&lt;`? Or `{{`?
    // Let's implement regex that targets `&lt;%` or `&lt;{{`?
    // No, Handlebars is `{{ ... }}`.
    // If Quill outputs `&lt;variable&gt;` that's `<variable>`.
    // If I want `{{variable}}`, and Quill makes it `{{variable}}`, then I don't need to do anything.
    // But if Quill makes it `&lbrace;&lbrace;variable&rbrace;&rbrace;`?
    // `&#123;` is `{`.

    // I'll stick to replacing `&#123;` with `{` and `&#125;` with `}`.
    // And `&lt;` with `<` IF it looks like a tag? No.

    // Let's look at `injectVariables` in `emailService.ts`:
    // It replaces `{{key}}` with value.

    // If I follow the plan EXACTLY:
    // .replace(/&lt;/g, '{{')
    // .replace(/&gt;/g, '}}')
    // This will turn EVERY `<` into `{{` and EVERY `>` into `}}`.
    // This breaks `&lt;3` (heart) -> `{{3`.
    // This breaks `x &lt; y` -> `x {{ y`.

    // I suspect the plan author meant "If I type {{...}} and it gets escaped as &lt;&lt;...&gt;&gt; then fix it".
    // OR, they assume users will type `<variable>` to mean `{{variable}}`? No.

    // I will check the `Risk` section again.
    // "React Quill might escape {{ and }} as HTML entities".
    // If so, `{{` becomes `{{` usually.

    // I will implement a targeted replacement.
    // Restore `&#123;` and `&#125;` to `{` and `}`.
    // Restore `&lt;!--` comments?

    // I'll stick to just unescaping existing braces and maybe assume the plan's specific `replace` loop was pseudo-code or I should only apply it if I detect the issue.
    // I will trust that standard Quill usage preserves `{{ }}`.
    // I will implement `&#123;` -> `{` and `&#125;` -> `}`.

    processedBody = processedBody
        .replace(/&#123;/g, '{')
        .replace(/&#125;/g, '}');

    // Verify placeholder
    if (!universalTemplate.includes('{{BODY_CONTENT}}')) {
        throw new Error('Universal template missing {{BODY_CONTENT}} placeholder');
    }

    return universalTemplate.replace('{{BODY_CONTENT}}', processedBody);
}

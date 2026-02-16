import { supabase } from '../../lib/supabase';
import { EmailTemplate, EmailTemplateFormData, NotificationJobType } from '../../types/emailTemplates.types';
import Handlebars from 'handlebars';
import { wrapEmailContent } from '../../utils/emailTemplateWrapper';

export const emailTemplatesService = {
    /**
     * List email templates with pagination
     */
    async getEmailTemplates(page = 1, limit = 20) {
        if (import.meta.env.MODE === 'demo') {
            return { data: [], count: 0, page, limit, totalPages: 0 };
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, count, error } = await (supabase as any)
            .from('email_templates')
            .select('*', { count: 'exact' })
            .order('is_active', { ascending: false })
            .order('type', { ascending: true })
            .range(from, to);

        if (error) throw error;

        return {
            data: data as EmailTemplate[],
            count: count || 0,
            page,
            limit,
            totalPages: count ? Math.ceil(count / limit) : 0
        };
    },

    /**
     * Get single email template by slug
     */
    async getEmailTemplate(slug: string) {
        const { data, error } = await (supabase as any)
            .from('email_templates')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) throw error;

        return data as EmailTemplate;
    },

    /**
     * Update email template with optimistic locking
     */
    async updateEmailTemplate(
        id: string,
        data: EmailTemplateFormData,
        lastUpdatedAt?: string
    ) {
        // 1. Validate variables
        const extractedVars = this.extractVariablesFromHtml(data.body_content);
        const subjectVars = this.extractVariablesFromHtml(data.subject_template);
        const allVars = [...new Set([...extractedVars, ...subjectVars])];

        // 2. Wrap HTML content
        const wrappedHtml = wrapEmailContent(data.body_content, allVars);

        // 3. Prepare update payload
        const payload: any = {
            body_content: data.body_content,
            html_content: wrappedHtml,
            subject_template: data.subject_template,
            preview_text: data.preview_text,
            variables: allVars, // Store all variables found
            updated_at: new Date().toISOString()
        };

        if (data.description !== undefined) {
            payload.description = data.description;
        }

        // 4. Perform update with optimistic locking check
        let query = (supabase as any)
            .from('email_templates')
            .update(payload)
            .eq('id', id);

        if (lastUpdatedAt) {
            query = query.eq('updated_at', lastUpdatedAt);
        }

        const { data: updatedData, error } = await query.select('*').single();

        if (error) throw error;
        if (!updatedData) {
            // If no data returned, it likely means the updated_at check failed (optimistic lock error)
            // OR the record was deleted.
            // We should check if the record exists to confirm.
            throw new Error('Conflict: Template was modified by another user. Please reload and try again.');
        }

        return updatedData as unknown as EmailTemplate;
    },

    /**
     * Toggle template active status
     */
    async toggleTemplateActive(id: string, isActive: boolean) {
        if (isActive) {
            // 1. Get the type of the template we are activating
            const { data: template } = await (supabase as any).from('email_templates').select('type').eq('id', id).single();
            if (template) {
                // 2. Deactivate all others of this type
                await (supabase as any).from('email_templates')
                    .update({ is_active: false })
                    .eq('type', template.type)
                    .neq('id', id);
            }
        }

        const { data, error } = await (supabase as any)
            .from('email_templates')
            .update({ is_active: isActive })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        return data as EmailTemplate;
    },

    /**
     * Duplicate a template
     */
    async duplicateTemplate(id: string, newSlug?: string) {
        // 1. Get original template
        const { data: original, error: fetchError } = await (supabase as any)
            .from('email_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!original) throw new Error('Original template not found');

        const originalTemplate = original as EmailTemplate;

        // 2. Generate slug if not provided
        const slug = newSlug || `${originalTemplate.slug}-copy-${Date.now()}`;

        // 3. Insert new template
        const { data, error } = await (supabase as any)
            .from('email_templates')
            .insert({
                slug,
                name: `${originalTemplate.name} (Copy)`,
                type: originalTemplate.type,
                description: originalTemplate.description,
                html_content: originalTemplate.html_content,
                body_content: originalTemplate.body_content,
                subject_template: originalTemplate.subject_template,
                preview_text: originalTemplate.preview_text,
                variables: originalTemplate.variables,
                required_variables: originalTemplate.required_variables,
                is_active: false // Default to inactive
            })
            .select('*')
            .single();

        if (error) throw error;
        return data as EmailTemplate;
    },

    /**
     * Delete template (Soft delete or hard delete)
     * For drafts (inactive), hard delete is fine.
     * For active, we should deactivate or prevent delete.
     */
    async deleteEmailTemplate(id: string) {
        if (import.meta.env.MODE === 'demo') {
            throw new Error('Cannot delete in demo mode');
        }

        // Just perform a hard delete for now as per requirements allowing full CRUD
        // But maybe check if it is active first?
        const { error } = await (supabase as any)
            .from('email_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Create a new email template
     */
    async createEmailTemplate(
        data: EmailTemplateFormData & {
            name: string;
            slug: string;
            type: NotificationJobType;
        }
    ) {
        if (import.meta.env.MODE === 'demo') {
            throw new Error('Cannot create in demo mode');
        }

        // 1. Validate variables
        const extractedVars = this.extractVariablesFromHtml(data.body_content);
        const subjectVars = this.extractVariablesFromHtml(data.subject_template);
        const allVars = [...new Set([...extractedVars, ...subjectVars])];

        // 2. Wrap HTML content
        const wrappedHtml = wrapEmailContent(data.body_content, allVars);

        // 3. Prepare insert payload
        const payload: any = {
            name: data.name,
            slug: data.slug,
            type: data.type,
            description: data.description,
            body_content: data.body_content,
            html_content: wrappedHtml,
            subject_template: data.subject_template,
            preview_text: data.preview_text,
            variables: allVars,
            required_variables: [], // Can implement required vars logic if needed
            is_active: false // Default to inactive on create
        };

        const { data: newTemplate, error } = await (supabase as any)
            .from('email_templates')
            .insert(payload)
            .select('*')
            .single();

        if (error) throw error;
        return newTemplate as EmailTemplate;
    },

    // --- Utility Functions ---

    /**
     * Sanitize HTML content for Handlebars parsing
     * Replaces HTML entities inside {{...}} with their character equivalents
     */
    sanitizeHandlebarsContent(html: string): string {
        if (!html) return '';
        // 1. Unescape HTML entities inside {{...}} blocks
        // This regex finds content between braces and runs a replacement function
        return html.replace(/{{([\s\S]*?)}}/g, (_, inner) => {
            // Replace common entities: &nbsp; -> space, &lt; -> <, &gt; -> >, &amp; -> &
            let cleaned = inner
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/<[^>]+>/g, ''); // Remove any HTML tags that might have slipped in

            return `{{${cleaned}}}`;
        });
    },

    /**
     * Extract variables from HTML using Handlebars parser
     */
    extractVariablesFromHtml(html: string): string[] {
        if (!html) return [];
        try {
            // Sanitize first to avoid parser errors from WYSIWYG garbage
            const cleanHtml = this.sanitizeHandlebarsContent(html);
            const ast = Handlebars.parse(cleanHtml);
            const variables = new Set<string>();

            const traverse = (node: any) => {
                if (!node) return;

                if (node.type === 'MustacheStatement') {
                    if (node.path?.original) {
                        variables.add(node.path.original);
                    }
                    // Check params/hash if any (e.g. helpers)
                    if (node.params) node.params.forEach(traverse);
                    if (node.hash) traverse(node.hash);
                } else if (node.type === 'BlockStatement') {
                    if (node.path?.original) {
                        // It's a block helper or variable (e.g. {{#if var}})
                        if (node.path.original !== 'if' && node.path.original !== 'each' && node.path.original !== 'unless') {
                            variables.add(node.path.original);
                        }
                    }
                    // Check params for helpers (e.g. {{#if variable}})
                    if (node.params) {
                        node.params.forEach((param: any) => {
                            if (param.type === 'PathExpression') variables.add(param.original);
                        });
                    }
                    if (node.program) traverse(node.program);
                    if (node.inverse) traverse(node.inverse);
                } else if (node.type === 'PathExpression') {
                    variables.add(node.original);
                } else if (node.type === 'Program') {
                    node.body.forEach(traverse);
                }
            };

            traverse(ast);

            // Filter out internal Handlebars keywords if needed, though 'parse' usually handles structure.
            // We extracted 'original' path.
            // Remove duplicates and sort
            return Array.from(variables).filter(v => v !== 'this' && v !== '.').sort();
        } catch (error) {
            console.error('Failed to extract variables:', error);
            return [];
        }
    },

    /**
     * Validate Handlebars syntax (Block matching)
     */
    validateHandlebarsSyntax(html: string): { valid: boolean; errors: string[] } {
        try {
            const cleanHtml = this.sanitizeHandlebarsContent(html);
            Handlebars.parse(cleanHtml);
            return { valid: true, errors: [] };
        } catch (error: any) {
            return { valid: false, errors: [error.message] };
        }
    },

    /**
     * Check for variable collisions between body and universal template
     * Universal template uses: organization_name, organization_logo_url, organization_secondary_color, organization_primary_color, email_footer_text, unsubscribe_url, email_subject
     */
    checkVariableCollisions(bodyVariables: string[]): string[] {
        const universalVars = [
            'organization_name',
            'organization_logo_url',
            'organization_secondary_color',
            'organization_primary_color',
            'email_footer_text',
            'unsubscribe_url',
            'email_subject'
        ];

        return bodyVariables.filter(v => universalVars.includes(v));
    }
};

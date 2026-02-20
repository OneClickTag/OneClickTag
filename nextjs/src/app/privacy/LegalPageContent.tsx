import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LegalSection {
  id: string;
  title: string;
  content: string;
}

interface LegalContent {
  effectiveDate?: string;
  lastUpdated?: string;
  introduction?: string;
  sections?: LegalSection[];
  contactInfo?: string;
}

interface LegalPageContentProps {
  content: string;
  pageType: 'terms' | 'privacy';
}

function parseLegalContent(content: string): LegalContent | null {
  try {
    const parsed = JSON.parse(content);
    // Verify it has the expected structure
    if (parsed.sections || parsed.introduction || parsed.effectiveDate) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// Render markdown content with proper styling
function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-6 my-4 space-y-2 text-gray-700">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 my-4 space-y-2 text-gray-700">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-gray-700 leading-relaxed">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-600 hover:text-blue-800 underline"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function LegalPageContent({ content, pageType }: LegalPageContentProps) {
  const parsedContent = parseLegalContent(content);

  // If it's JSON structured content from LegalPageEditor
  if (parsedContent) {
    return (
      <div className="space-y-8">
        {/* Introduction */}
        {parsedContent.introduction && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
            <MarkdownRenderer content={parsedContent.introduction} />
          </div>
        )}

        {/* Sections */}
        <div className="space-y-10">
          {(parsedContent.sections || []).map((section, index) => (
            <section key={section.id} className="scroll-mt-8" id={`section-${index + 1}`}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {index + 1}. {section.title}
              </h2>
              <div className="text-gray-700 leading-relaxed">
                <MarkdownRenderer content={section.content} />
              </div>
            </section>
          ))}
        </div>

        {/* Contact Info */}
        {parsedContent.contactInfo && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Us</h3>
              <MarkdownRenderer content={parsedContent.contactInfo} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Legacy content - check if it's HTML or Markdown
  const isHTML = /<[a-z][\s\S]*>/i.test(content);

  if (isHTML) {
    return (
      <div
        className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-p:text-gray-700 prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Plain markdown
  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-8 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8 first:mt-0 pb-2 border-b border-gray-200">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 leading-relaxed mb-4">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 my-4 space-y-2 text-gray-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 my-4 space-y-2 text-gray-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-700 leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600 bg-gray-50 py-2 rounded-r">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

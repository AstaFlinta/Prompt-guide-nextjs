'use client'

import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { promptGuideData, GuideData } from './PromptGuide'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'

const processHighlights = (content: string) => {
  const parts = content.split(/(\[\[highlight\]\]|\[\[\/highlight\]\])/);
  let isHighlighting = false;
  return (
    <>
      {parts.map((part, index) => {
        if (part === '[[highlight]]') {
          isHighlighting = true;
          return null;
        }
        if (part === '[[/highlight]]') {
          isHighlighting = false;
          return null;
        }
        if (isHighlighting) {
          return <span key={index} className="bg-blue-100 p-1 rounded inline-block whitespace-pre-wrap">{part}</span>;
        }
        return part;
      })}
    </>
  );
};

const processContent = (content: string, setModalImage: (src: string | null) => void) => {
  const parts = content.split(/(Prompt:[\s\S]*?)(?=\n\n|$)|(System:[\s\S]*?)(?=\n\n|$)|(Image:[\s\S]*?)(?=\n\n|$)/g);

  const createInternalLink = (text: React.ReactNode): React.ReactNode => {
    if (typeof text !== 'string') return text;

    const matches = text.match(/\[\[(.*?)\]\]/g);
    if (!matches) return text;

    const elements = text.split(/(\[\[.*?\]\])/g).map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const innerText = part.slice(2, -2);
        const id = innerText.toLowerCase().replace(/\s+/g, '-');
        return (
          <a
            key={index}
            href={`#${id}`}
            className="text-black hover:text-blue-600 hover:underline transition-colors duration-200"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById(id);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            {innerText}
          </a>
        );
      }
      return part;
    });

    return <>{elements}</>;
  };

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('Prompt:')) {
      const lines = part.split('\n');
      return (
        <div key={index} className="bg-blue-100 p-2 my-4 rounded">
          {lines.map((line, lineIndex) => {
            if (line.startsWith('Prompt:') || line.startsWith('Svar:')) {
              const [label, ...content] = line.split(':');
              return (
                <div key={lineIndex} className="flex items-baseline">
                  <span className="text-blue-800 font-medium w-16 flex-shrink-0">{label}:</span>
                  <div className="text-gray-800 flex-1">
                    <ReactMarkdown components={MarkdownComponents}>
                      {content.join(':').trim()}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={lineIndex} className="text-gray-800 ml-16">
                  <ReactMarkdown components={MarkdownComponents}>
                    {line.trim()}
                  </ReactMarkdown>
                </div>
              );
            }
          })}
        </div>
      );
    } else if (part?.startsWith('System:')) {
      if (part.startsWith('*System:*')) {
        return <ReactMarkdown key={index} components={MarkdownComponents}>
          {part.replace(/^\*System:\*\s*/, '')}
        </ReactMarkdown>;
      }

      const lines = part.split('\n').map(line => line.trim()).filter(line => line !== '');
      return (
        <div key={index} className="bg-blue-100 p-2 my-4 rounded">
          {lines.map((line, lineIndex) => {
            const [label, ...content] = line.split(':');
            if (['System', 'User', 'Assistant'].includes(label)) {
              return (
                <div key={lineIndex} className="flex items-start mb-3">
                  <span className="text-blue-800 font-medium w-20 flex-shrink-0">{label}:</span>
                  <div className="text-foreground flex-1">
                    <ReactMarkdown components={{
                      ...MarkdownComponents,
                      p: ({node, ...props}) => <p className="my-0.5" {...props} />
                    }}>
                      {content.join(':').trim()}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={lineIndex} className="ml-20 text-foreground mb-2">
                  <ReactMarkdown components={{
                    ...MarkdownComponents,
                    p: ({node, ...props}) => <p className="my-0.5" {...props} />
                  }}>
                    {line}
                  </ReactMarkdown>
                </div>
              );
            }
          })}
        </div>
      );
    } else if (part.startsWith('Image:')) {
      const [_, imagePath] = part.split(':');
      const trimmedPath = imagePath.trim();
      return (
        <div key={index} className="my-4">
          <Image 
            src={trimmedPath} 
            alt="Guide image" 
            width={500} 
            height={300} 
            className="rounded-lg cursor-pointer" 
            onClick={() => setModalImage(trimmedPath)}
          />
        </div>
      );
    } else if (part.trim() !== '') {
      return <ReactMarkdown key={index} components={{
        ...MarkdownComponents,
        p: ({ children }) => <p className="mb-4 whitespace-pre-line">{createInternalLink(children)}</p>,
      }}>{part}</ReactMarkdown>;
    }
    return null;
  }).filter(Boolean);
};

const MarkdownComponents = {
  p: (props: any) => {
    const { children } = props;
    
    // Function to extract prompt content
    const extractPrompt = (text: string) => {
      const match = text.match(/^Prompt:\s*([\s\S]*?)(?:\n\n|$)/);
      return match ? match[1].trim() : null;
    };

    // Check if children is a string or an array of strings/elements
    const textContent = Array.isArray(children) 
      ? children.map(child => typeof child === 'string' ? child : '').join('')
      : typeof children === 'string' ? children : '';

    const promptContent = extractPrompt(textContent);

    if (promptContent) {
      return (
        <div className="bg-blue-100 p-2 my-4 rounded">
          <div className="flex items-start">
            <span className="text-blue-800 font-medium w-16 flex-shrink-0">Prompt:</span>
            <div className="text-gray-800 flex-1 whitespace-pre-wrap break-words">
              {promptContent}
            </div>
          </div>
        </div>
      );
    }

    // If it's not a prompt, render as a normal paragraph
    return <p className="mb-4 whitespace-pre-line" {...props} />;
  },
  li: (props: any) => {
    const { children } = props;
    return <li className="ml-4 mb-2 whitespace-pre-wrap break-words" {...props} />;
  },
  h1: (props: any) => <h1 className="text-2xl font-bold mb-4" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-semibold mb-3" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-medium mb-2" {...props} />,
  ul: (props: any) => <ul className="list-disc list-inside mb-4" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-4" {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4" {...props} />,
  a: (props: any) => {
    return <a className="text-black hover:text-blue-600 hover:underline transition-colors duration-200" {...props} />;
  },
}

export default function MainPage() {
  const [guideData, setGuideData] = useState<GuideData | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)

  useEffect(() => {
    setGuideData(promptGuideData)
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const id = window.location.hash.slice(1)
      if (id) {
        const element = document.getElementById(id)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Handle initial hash on page load

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar onToggle={handleSidebarToggle} />
      
      <main className={`transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'ml-16' : 'ml-72'
      }`}>
        <div className="py-8 px-4 sm:px-8 max-w-3xl mx-auto">
          {guideData && (
            <>
              <h1 className="mb-8 text-4xl font-bold text-gray-900">{guideData.title}</h1>
              {guideData.sections.map((section) => (
                <div key={section.id} id={`section-${section.id}`} className="mb-12">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                    <span className="mr-3 text-3xl">{section.icon}</span>
                    {section.title}
                  </h2>
                  {section.content && (
                    <div className="prose prose-gray max-w-none mb-6">
                      {processContent(section.content, setModalImage)}
                    </div>
                  )}
                  {section.methods && section.methods.length > 0 && (
                    <div className="space-y-8">
                      {section.methods.map((method) => (
                        <section key={method.id} id={method.id} className="bg-white shadow-md rounded-lg p-6">
                          <h3 className="text-2xl font-bold text-gray-800 mb-6">{method.title}</h3>
                          <div className="prose prose-gray max-w-none mb-6">
                            {processContent(method.content, setModalImage)}
                          </div>
                          {method.implementations && method.implementations.length > 0 && (
                            <div className="space-y-6 mt-8">
                              {method.implementations.map((impl) => (
                                <div key={impl.id} id={impl.id} className="bg-gray-50 rounded-lg p-4">
                                  <h5 className="text-lg font-semibold text-gray-700 mb-3">{impl.title}</h5>
                                  <div className="prose prose-gray max-w-none">
                                    {processContent(impl.content, setModalImage)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </main>
      {modalImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setModalImage(null)}
        >
          <div className="max-w-4xl max-h-4xl">
            <Image 
              src={modalImage} 
              alt="Enlarged image" 
              width={1000} 
              height={1000} 
              className="rounded-lg"
              objectFit="contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
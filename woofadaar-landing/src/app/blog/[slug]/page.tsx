import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getBlogPostBySlug, getAllBlogPosts } from '@/lib/blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Article Not Found - Woofadaar',
    };
  }

  return {
    title: `${post.title} - Woofadaar Blog`,
    description: post.description,
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-milkWhite">
      <Header />

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-ui-textTertiary mb-8">
          <Link href="/" className="hover:text-primary-mint transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary-mint transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-ui-textSecondary line-clamp-1">{post.title}</span>
        </nav>

        {/* Category Badge */}
        <div className="mb-6">
          <span className="inline-block px-4 py-2 bg-primary-mint/10 text-primary-mint font-semibold text-sm rounded-full">
            Dog Parenting Tips
          </span>
        </div>

        {/* Title & Meta */}
        <header className="mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-mutedPurple mb-6 leading-tight">
            {post.title}
          </h1>
          <p className="text-xl sm:text-2xl text-ui-textSecondary mb-8 leading-relaxed">
            {post.subtitle}
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-mint rounded-full flex items-center justify-center text-white font-bold">
                {post.author.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-ui-textPrimary">{post.author}</div>
                <div className="text-sm text-ui-textTertiary">
                  {new Date(post.date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="relative aspect-video rounded-3xl mb-16 overflow-hidden shadow-xl border border-ui-border">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none mb-16">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ node, ...props }) => (
                <h2 className="text-3xl sm:text-4xl font-bold text-primary-mutedPurple mt-16 mb-6 leading-tight" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-2xl sm:text-3xl font-bold text-ui-textPrimary mt-12 mb-4" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="text-lg text-ui-textSecondary leading-relaxed mb-6" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-primary-mutedPurple" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="text-primary-mint hover:text-primary-coral underline decoration-2 underline-offset-4 transition-colors font-semibold" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="space-y-4 mb-8" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="space-y-4 mb-8" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="text-lg text-ui-textSecondary leading-relaxed pl-2 relative before:content-[''] before:absolute before:left-[-20px] before:top-[12px] before:w-2 before:h-2 before:bg-primary-mint before:rounded-full" {...props} />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Share Section */}
        <div className="border-t border-ui-border pt-8 mb-16">
          <p className="text-sm text-ui-textTertiary mb-4">Share this article</p>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-primary-mint/10 text-primary-mint rounded-full font-semibold hover:bg-primary-mint hover:text-white transition-colors">
              Twitter
            </button>
            <button className="px-6 py-3 bg-primary-mint/10 text-primary-mint rounded-full font-semibold hover:bg-primary-mint hover:text-white transition-colors">
              Facebook
            </button>
            <button className="px-6 py-3 bg-primary-mint/10 text-primary-mint rounded-full font-semibold hover:bg-primary-mint hover:text-white transition-colors">
              WhatsApp
            </button>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 p-10 sm:p-12 bg-primary-mint rounded-3xl text-center">
          <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Join Our Community
          </h3>
          <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Follow us on Instagram for daily dog parenting tips, heartwarming stories, and expert advice
          </p>
          <a
            href="https://instagram.com/woofadaarofficial"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-primary-mint font-bold px-10 py-4 rounded-full hover:bg-neutral-milkWhite transition-all duration-300"
          >
            Follow @woofadaarofficial
          </a>
        </div>

        {/* Back to Blog */}
        <div className="mt-16 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-primary-mint hover:text-primary-coral font-semibold transition-colors text-lg group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to all articles
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}

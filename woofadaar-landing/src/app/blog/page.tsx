import Link from 'next/link';
import Image from 'next/image';
import { getAllBlogPosts } from '@/lib/blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Blog - Woofadaar',
  description: 'Simple, honest guides for dog parents in India. Real advice for real life.',
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Articles Grid - Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post, index) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className={`group block ${index === 0 ? 'md:col-span-2' : ''}`}
            >
              <article className={`bg-neutral-milkWhite rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 ${index === 0 ? 'flex flex-col md:grid md:grid-cols-2' : ''}`}>
                {/* Image - different images for mobile vs desktop */}
                <div className={`relative ${index === 0 ? 'aspect-[4/3] md:aspect-auto md:h-full order-first' : 'aspect-[16/10]'} overflow-hidden`}>
                  {/* Mobile image */}
                  <Image
                    src={post.imageMobile || post.image}
                    alt={post.title}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500 md:hidden"
                  />
                  {/* Desktop image */}
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover object-right group-hover:scale-105 transition-transform duration-500 hidden md:block"
                  />
                </div>

                {/* Content */}
                <div className={`p-6 ${index === 0 ? 'sm:p-10 flex flex-col justify-center order-last' : 'sm:p-8'}`}>
                  {/* Tag */}
                  <span className="inline-block px-3 py-1 bg-primary-mint/10 text-primary-mint rounded-full text-xs font-semibold mb-4 w-fit">
                    Dog Parenting
                  </span>

                  {/* Title */}
                  <h2 className={`font-bold text-primary-mutedPurple group-hover:text-primary-mint transition-colors mb-3 ${index === 0 ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
                    {post.title}
                  </h2>

                  {/* Subtitle */}
                  <p className={`text-ui-textSecondary mb-4 ${index === 0 ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'}`}>
                    {post.subtitle}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-sm text-ui-textTertiary mt-auto">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{new Date(post.date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

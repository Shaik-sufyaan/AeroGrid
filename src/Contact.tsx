import { useState } from 'react';

interface ContactProps {
  onBack: () => void;
}

const Contact = ({ onBack }: ContactProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', company: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black/95 z-50 overflow-y-auto">
      <div className="min-h-full px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="text-white text-2xl font-bold tracking-wider font-mono">
            SKYGUARD AI
          </div>
          <button
            onClick={onBack}
            className="text-white hover:text-orange-400 transition font-mono"
          >
            ← Back to Home
          </button>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-4 font-mono">
            Get in <span className="text-orange-400">Touch</span>
          </h1>
          <p className="text-white/70 text-xl mb-12 font-mono">
            Interested in implementing AI-powered geofence avoidance for your fleet? Let's talk.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6 font-mono">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-white mb-2 font-mono" htmlFor="name">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-orange-400 transition"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 font-mono" htmlFor="email">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-orange-400 transition"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 font-mono" htmlFor="company">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-orange-400 transition"
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 font-mono" htmlFor="message">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-orange-400 transition resize-none"
                    placeholder="Tell us about your project..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition shadow-lg font-mono"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
                <h3 className="text-xl font-bold text-orange-400 mb-4 font-mono">Email</h3>
                <p className="text-white/80 font-mono">contact@skyguardai.com</p>
                <p className="text-white/80 font-mono">support@skyguardai.com</p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
                <h3 className="text-xl font-bold text-orange-400 mb-4 font-mono">Office</h3>
                <p className="text-white/80 font-mono">
                  123 Aviation Boulevard<br />
                  Tech City, TC 12345<br />
                  United States
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
                <h3 className="text-xl font-bold text-orange-400 mb-4 font-mono">Business Hours</h3>
                <p className="text-white/80 font-mono">
                  Monday - Friday: 9:00 AM - 6:00 PM<br />
                  Saturday: 10:00 AM - 4:00 PM<br />
                  Sunday: Closed
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
                <h3 className="text-xl font-bold text-orange-400 mb-4 font-mono">Emergency Support</h3>
                <p className="text-white/80 font-mono">
                  24/7 Technical Support<br />
                  +1 (555) 123-4567
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

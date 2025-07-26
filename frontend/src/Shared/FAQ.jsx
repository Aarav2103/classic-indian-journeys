import React, { useState } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { motion, AnimatePresence } from 'framer-motion';
import Newsletter from './Newsletter';
import './FAQ.css';

const FAQ = () => {
  const faqData = [
    {
      question: 'How can I contact your team?',
      answer:
        'You can reach us via the Contact page, email, or WhatsApp. We are happy to assist you with any inquiries or requests.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept credit/debit cards, UPI, and bank transfers. All transactions are secure and encrypted.',
    },
    {
      question: 'Can I customize my experience?',
      answer:
        'Yes, we offer tailor-made experiences. Let us know your preferences and we’ll curate a journey to match.',
    },
    {
      question: 'Do I need to create an account to book?',
      answer:
        'No, you can book without an account. However, signing up gives you access to exclusive offers and faster bookings.',
    },
    {
      question: 'Is my personal data safe with you?',
      answer:
        'Absolutely. We do not share your data and ensure full privacy using secure encryption methods.',
    },
  ];

  const [activeIndex, setActiveIndex] = useState(null);

  const toggle = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <>
      <section className="faq-section py-5">
        <Container>
          <Row>
            <Col lg="10" className="mx-auto">
              <motion.h2
                className="faq-heading text-center mb-5"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                Frequently Asked Questions
              </motion.h2>
              <div className="faq-list">
                {faqData.map((item, index) => (
                  <motion.div
                    key={index}
                    className={`faq-card ${activeIndex === index ? 'active' : ''}`}
                    onClick={() => toggle(index)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="faq-question">
                      <h5>{item.question}</h5>
                      <span className="faq-icon">
                        {activeIndex === index ? (
                          <i className="ri-arrow-up-s-line"></i>
                        ) : (
                          <i className="ri-arrow-down-s-line"></i>
                        )}
                      </span>
                    </div>
                    <AnimatePresence>
                      {activeIndex === index && (
                        <motion.p
                          className="faq-answer"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {item.answer}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </Col>
          </Row>
        </Container>
      </section>
      <Newsletter />
    </>
  );
};

export default FAQ;

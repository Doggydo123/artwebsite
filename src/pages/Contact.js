function Contact() {
  return (
    <main className="site-main">
      <section id="contact" className="section section-contact">
        <h2>Contact</h2>
        <p>
          For enquiries, commissions, or exhibition opportunities, please get
          in touch:
        </p>
        <p className="contact-details">
          Email: <a href="mailto:artist@example.com">artist@example.com</a>
          <br />
          Instagram:{" "}
          <a
            href="https://instagram.com/your-handle"
            target="_blank"
            rel="noreferrer"
          >
            @your-handle
          </a>
        </p>
      </section>
    </main>
  );
}

export default Contact;

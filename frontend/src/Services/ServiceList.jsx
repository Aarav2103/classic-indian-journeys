import React from "react";
import { Container, Row, Col } from "reactstrap";
import { FaLandmark, FaShip, FaPagelines } from "react-icons/fa";

const ServiceList = () => {
  const experiences = [
    {
      icon: <FaLandmark size={34} color="#c59d5f" />,
      title: "Heritage Palaces",
      duration: "8 Days",
    },
    {
      icon: <FaShip size={34} color="#c59d5f" />,
      title: "Royal River Cruises",
      duration: "6 Days",
    },
    {
      icon: <FaPagelines size={34} color="#c59d5f" />,
      title: "Cultural Immersions",
      duration: "5 Days",
    },
  ];

  return (
    <section
      style={{
        backgroundColor: "#f7ecd5",
        padding: "4rem 0",
        borderTop: "1px solid #e4d1b9",
        borderBottom: "1px solid #e4d1b9",
      }}
    >
      <Container data-aos="fade-up">
        <h2 className="signature-heading">Signature Experiences</h2>

        <p
          style={{
            fontFamily: "var(--libre-font)",
            color: "#6c4f3d",
            fontSize: "1.1rem",
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Bespoke heritage journeys with regal charm
        </p>

        <Row className="justify-content-center text-center">
          {experiences.map((exp, idx) => (
            <Col
              lg="4"
              md="6"
              sm="12"
              key={idx}
              style={{
                borderRight: idx !== experiences.length - 1 ? "1px solid #dec9a4" : "none",
                padding: "1.5rem 1rem",
              }}
              data-aos="zoom-in"
              data-aos-delay={idx * 100}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center", // 👈 centers icon + text horizontally
                  textAlign: "center",
                }}
              >
                <div style={{ marginBottom: "1rem" }}>{exp.icon}</div>
                <h5
                  style={{
                    fontFamily: "var(--cinzel-font)",
                    color: "#2d2014",
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    marginBottom: "0.3rem",
                    textTransform: "none",
                  }}
                >
                  {exp.title}
                </h5>
                <p
                  style={{
                    color: "#c59d5f",
                    fontWeight: "500",
                    fontSize: "0.95rem",
                    margin: 0,
                  }}
                >
                  {exp.duration}
                </p>
              </div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default ServiceList;

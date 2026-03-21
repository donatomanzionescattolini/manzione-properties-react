import { Col, Container, Row } from 'react-bootstrap'

const services = [
  {
    icon: '🏛️',
    title: 'Arquitectura',
    description:
      'Diseño arquitectónico de excelencia que combina funcionalidad y estética para crear espacios únicos.',
  },
  {
    icon: '🏡',
    title: 'Diseño de Interiores',
    description:
      'Propuestas de diseño interior que reflejan el estilo y personalidad de cada cliente, con materiales premium.',
  },
  {
    icon: '🏗️',
    title: 'Desarrollo Residencial',
    description:
      'Proyectos de desarrollo residencial de alta gama con atención al detalle en cada etapa constructiva.',
  },
  {
    icon: '🔑',
    title: 'Consultoría Inmobiliaria',
    description:
      'Asesoramiento profesional para la compra, venta e inversión en bienes raíces premium.',
  },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mp-hero" id="home">
        <Container>
          <p className="mp-hero__eyebrow">Bienvenidos a</p>
          <h1 className="mp-hero__title">
            Manzione <em>Properties</em>
          </h1>
          <p className="mp-hero__subtitle">
            Especialistas en arquitectura, diseño y desarrollo residencial de alta gama.
          </p>
          <a href="#contact" className="mp-hero__cta">
            Contáctenos
          </a>
        </Container>
      </section>

      {/* About */}
      <section className="mp-about" id="about">
        <Container>
          <Row className="align-items-center g-5">
            <Col xs={12} md={5}>
              <img
                src="https://pagina-mama.s3.amazonaws.com/assets2/asociados/monica.jpg"
                alt="Manzione Properties"
                className="mp-about__img"
              />
            </Col>
            <Col xs={12} md={7}>
              <p className="mp-about__eyebrow">Quiénes somos</p>
              <h2 className="mp-about__title">Manzione Properties</h2>
              <div className="mp-about__divider" />
              <p className="mp-about__text">
                Somos especialistas en arquitectura, diseño y desarrollo residencial de alta gama.
                Nuestra misión es transformar cada proyecto en una obra que supere las expectativas
                de nuestros clientes, combinando innovación, calidad y elegancia.
              </p>
              <p className="mp-about__text">
                Con años de experiencia en el mercado inmobiliario premium, ofrecemos un servicio
                integral que abarca desde la concepción del proyecto hasta su entrega final.
              </p>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Services */}
      <section className="mp-services" id="services">
        <Container>
          <h2 className="mp-services__title">Nuestros Servicios</h2>
          <p className="mp-services__subtitle">
            Ofrecemos soluciones integrales para sus proyectos inmobiliarios.
          </p>
          <Row className="g-4">
            {services.map((s) => (
              <Col key={s.title} xs={12} sm={6} lg={3}>
                <div className="mp-service-card">
                  <div className="mp-service-card__icon">{s.icon}</div>
                  <p className="mp-service-card__title">{s.title}</p>
                  <p className="mp-service-card__text">{s.description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Contact CTA */}
      <section className="mp-contact" id="contact">
        <Container>
          <p className="mp-contact__eyebrow">Hablemos</p>
          <h2 className="mp-contact__title">¿Listo para comenzar su proyecto?</h2>
          <p className="mp-contact__text">
            Contáctenos para una consulta personalizada y descubra cómo podemos hacer realidad su
            visión.
          </p>
          <a
            href="mailto:info@manzioneproperties.com"
            className="mp-contact__btn"
          >
            Escríbanos
          </a>
        </Container>
      </section>
    </>
  )
}

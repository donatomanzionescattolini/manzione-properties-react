import { Container } from 'react-bootstrap'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mp-footer">
      <Container>
        <p className="mp-footer__brand">Manzione Properties</p>
        <p className="mp-footer__copy">
          &copy; {year} Manzione Properties. Todos los derechos reservados.
        </p>
      </Container>
    </footer>
  )
}

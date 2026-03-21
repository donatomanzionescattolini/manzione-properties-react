import { Container, Nav, Navbar as BsNavbar } from 'react-bootstrap'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <BsNavbar expand="md" className="mp-navbar">
      <Container>
        <BsNavbar.Brand as={Link} to="/">
          <span>MANZIONE</span> PROPERTIES
        </BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="mp-nav" />
        <BsNavbar.Collapse id="mp-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/#about">Nosotros</Nav.Link>
            <Nav.Link as={Link} to="/#services">Servicios</Nav.Link>
            <Nav.Link as={Link} to="/#contact">Contacto</Nav.Link>
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  )
}

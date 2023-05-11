/**
 * @jest-environment jsdom
 */

import {screen, waitFor, within} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH, ROUTES} from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";
import userEvent from "@testing-library/user-event";
import Bills from "../containers/Bills.js";

// créer le mock pour l'api
jest.mock("../app/Store", () => mockStore) 

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      const windowIcon = screen.getByTestId('icon-window') 
      // grace a l'inspecteur ou vois que l'icon necessite la class "active-icon" pour etre surligner https://github.com/testing-library/jest-dom#tohaveclass
      // cela ne fonctionne pas je me retrouve avec "TypeError: expect(...).toHaveClass is not a function"
      expect(windowIcon.classList.contains('active-icon')).toBe(true)

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
  })
  // ajout des autres tests pour avoir au minimum 80% de couverture
  // faire des test des différentes fonctionnalités et messages d'erreur, également les appelle api
  // test pour le bouton qui affiche le justificatif
  describe("When I click on the actions icon", () => {
    test("Then a modal should open", async () => {
      // il faut simuler l'intégration, ajouter les event listener, cliquer dessus, puis tester
      // constuire le dom
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      Object.defineProperty(window, 'localStorage', {value: localStorageMock})
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))

      const billsP = new Bills({
        document, onNavigate, store: mockStore, localStorage: window.localStorage
      })

      document.body.innerHTML = BillsUI({ data: bills })

      // récupération des éléments du dom
      // Unable to find an element by: [data-testid="icon-eye"]
      const actionIcons = document.querySelectorAll(`div[data-testid="icon-eye"]`)
      const handleClickIconEye = jest.fn(billsP.handleClickIconEye)
      const modal = document.getElementById('modaleFile')
      $.fn.modal = jest.fn(() => modal.classList.add("show"))

      // création de l'event listener
      actionIcons.forEach(actionIcon => {
        actionIcon.addEventListener('click', () => handleClickIconEye(actionIcon))
        userEvent.click(actionIcon)

        expect(handleClickIconEye).toHaveBeenCalled()
        expect(modal.classList.contains('show')).toBe(true)
      })
    })
  })
  
  // tester la navigation pour la route new bill
  describe("When i click on the new bill button", () => {
    test("Then it should navigate to NewBill", () => {

      // constuire le dom
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname})
      }

      Object.defineProperty(window, 'localStorage', {value: localStorageMock})
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))

      const billsP = new Bills({
        document, onNavigate, store: mockStore, localStorage: window.localStorage
      })

      document.body.innerHTML = BillsUI({ data: bills })

      // récupération des éléments du dom
      const buttonNewBill = document.querySelector(`button[data-testid="btn-new-bill"]`)
      expect(buttonNewBill).toBeTruthy()

      // création de l'event listner
      const handleNavigateToNewBill = jest.fn(billsP.handleClickNewBill)
      buttonNewBill.addEventListener('click', handleNavigateToNewBill)
      userEvent.click(buttonNewBill)

      expect(handleNavigateToNewBill).toHaveBeenCalled()
    })
  })

  describe("When i am on the bills page and it's loading", () => {
    test("Then the loading page should be rendered", async () => {
      
      // création du dom durant le loading
      document.body.innerHTML = BillsUI({loading: true})

      expect(document.getElementById('loading')).toBeDefined()
      expect(document.getElementById('loading').innerHTML).toMatch('Loading...')

      document.body.innerHTML = ""
    })
  })

  describe("When i am on the bills page but there is an error", () => {
    test("Then the error page should be rendered", async () => {
      
      // création du dom durant le loading
      document.body.innerHTML = BillsUI({error: "erreur"})

      const errorNode = document.querySelector(`div[data-testid="error-message"]`)

      expect(errorNode).toBeDefined()
      expect(errorNode.innerHTML).toMatch('erreur')

      document.body.innerHTML = ""
    })
  })

  // test l'api
  describe("When i am on the bills page", () => {
    describe("the api is fetched", () => {

      // ajout test si tout se passe bien
      test("fetches bills from mock API GET", async () => {
        jest.spyOn(mockStore, "bills")
          Object.defineProperty(
              window,
              'localStorage',
              { value: localStorageMock }
          )
        window.localStorage.setItem('user', JSON.stringify({
          type: 'Employee',
          email: "a@a"
        }))

        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.appendChild(root)
        router()

        window.onNavigate(ROUTES_PATH.Bills)
        const pageTitle = await waitFor(() => screen.getByText("Mes notes de frais"))
        const newBillBtn = await screen.findByRole("button", {name: /nouvelle note de frais/i,})
        const billsTableRows = screen.getByTestId("tbody")

        expect(pageTitle).toBeTruthy()
        expect(newBillBtn).toBeTruthy()
        expect(billsTableRows).toBeTruthy()
      })
    
      describe("the api return a error message", () => {

        beforeEach(() => {
          jest.spyOn(mockStore, "bills")
          Object.defineProperty(
              window,
              'localStorage',
              { value: localStorageMock }
          )
          window.localStorage.setItem('user', JSON.stringify({
            type: 'Employee',
            email: "a@a"
          }))
          const root = document.createElement("div")
          root.setAttribute("id", "root")
          document.body.appendChild(root)
          router()
        })

        test("the error message is a 404", async () => {
          mockStore.bills.mockImplementationOnce(() => {
            return {
              list : () => {
                return Promise.reject(new Error("Erreur 404"))
              }
            }
          })
          window.onNavigate(ROUTES_PATH.Bills)
          await new Promise(process.nextTick)
          const message = await screen.getByText(/Erreur 404/)
          expect(message).toBeTruthy
        })

        // ajout erreur 500
        test("the error message is a 500", async () => {
          mockStore.bills.mockImplementationOnce(() => {
            return {
              list : () => {
                return Promise.reject(new Error("Erreur 500"))
              }
            }
          })
          window.onNavigate(ROUTES_PATH.Bills)
          await new Promise(process.nextTick)
          const message = await screen.getByText(/Erreur 500/)
          expect(message).toBeTruthy
        })
      })
    })
  })
})




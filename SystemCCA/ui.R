
library(shiny)
library(shinyBS)
library(plotly)
require(zoo)

shinyUI(fluidPage(
 
  
  tags$head(    
    tags$style("label {display:inline;}") ,
    tags$link(rel = "stylesheet", type = "text/css", href = "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css")
    
    
  ),
  
  titlePanel("Systemic CCA Model"),
  
      sidebarLayout(
        
        
        sidebarPanel( width=4,
           bsCollapsePanel(
            h4("Load Excel data"),
            
            fileInput("File", label = "File input"),
            
            style = "info"
          ),#wellPanel1
          
          
          
          
          
          
          bsCollapsePanel(
            h4("Input parameters"),
          
            numericInput("start", label = textOutput("offset"),
                         value=1,min=1),
            numericInput("Ex_Window", label ="Extrema Period",
                         value=1,min=1),
            
            numericInput("step", 
                         label ="Step Size", 
                         value = 10) ,
            
            numericInput("window", 
                         label = "Window Size", 
                         value = 120) ,
            
            actionButton("submit", "Submit", styleclass ="primary"),

            

            style = "info"
        
        ),#wellPanel2
          
        bsCollapsePanel(
          h4("Select Risk Measures"),
          
          
          fluidRow(
            column(width = 6,
                
                   
             checkboxGroupInput("VaR_a", 
                             label = "Value at Risk ", 
                             choices = list("75%" = 0.75, 
                                            "80%" = 0.80, 
                                            "85%" = 0.85,
                                            "90%" = 0.90, 
                                            "95%" = 0.95, 
                                            "97.5%" = 0.975,
                                            "99%" = 0.99, 
                                            "99.5%" = 0.995                                 
                                            ),
                             
                             selected = 0.95)       
                   
            ),
            
            
            
            
            column(width = 6, 
                   checkboxGroupInput("ES_a", 
                                      label = "Expected Shortfall ", 
                                      choices = list("75%" = 0.75, 
                                                     "80%" = 0.80, 
                                                     "85%" = 0.85,
                                                     "90%" = 0.90, 
                                                     "95%" = 0.95 
                                      ),
                                      
                                      selected = 0.90)
                   
                   
                   
            )
          ),
          
          
         
          
         
          
        
          
          
        
 
         
          style = "info"
          
        )#wellPanel3
        
       
        
         
    
        ),#sidebarPanel
    
  
  


    
     mainPanel(
      
       
               tabsetPanel(
                 tabPanel("Value at Risk",  dataTableOutput('tbVaR')),
                 tabPanel("VaR - Plot", plotlyOutput("VaRPlot")),
                 tabPanel("Expected Shortfall", dataTableOutput('tbES')),
                 tabPanel("ES - Plot", plotlyOutput("ESPlot")),
                 tabPanel("Parameters", dataTableOutput('tbParm'))
                )#tabsetPanel
                                   

               
               )#mianPanel, 
  
    
    
   )# sidebarLayout
)#fluidPage
)#end
  
  
  





  
  
  


library(shiny)
library(plotly)
require(plotly)
require(zoo)

shinyUI(fluidPage(
 
  
  tags$head(    
    tags$style("label {display:inline;}")
  ),
  
  titlePanel("Dynamic Dependence Structure(DDS) Model"),
  
      sidebarLayout(
        sidebarPanel( 
          wellPanel(
            h4("Load Excel Data"),
            fileInput("File", label = "File input"),
            htmlOutput("selectUI")
            
          ),#wellPanel1
          wellPanel(
            h4("Input parameters"),
          
            numericInput("start", label = textOutput("offset"),
                         value=1,min=1),
            
            
            numericInput("step", 
                         label ="Step Size", 
                         value = 10) ,
            
            numericInput("window", 
                         label = "Window Size", 
                         value = 20) ,
            
            numericInput("n_quantile", 
                         label = "Quantile Count", 
                         value = 50)

        
        
        ),#wellPanel2
          
        wellPanel(
          h4("Plot dependence measure"),
          
          radioButtons("type", label = "Measure type",
                       choices = list("Chi"="chi","Chi Bar"="chibar"),
                       selected = "chi", inline=TRUE),
          
          h5("    1. Dependence vs percent"),
          
          htmlOutput("sliderUI"),
          
          checkboxGroupInput("confidences", 
                             label = "Confidence bands", 
                             choices = list("95%" = 0.95, 
                                            "80%" = 0.8, "75%" = 0.75),
                             selected = 0.95,inline=TRUE),
          
 
          h5("    2. Dependence vs time"),
          numericInput("percent", label = "Select percent",
                       value=95,min=1,max=100)
         
        
          
        )#wellPanel3
        
        
        
        
         
    
        ),#sidebarPanel
    
  
  


    
     mainPanel(plotOutput("Plot", height="600px"),
               
               br(),
               
               plotlyOutput("trendPlot")
               
               )#mianPanel, 
  
    
    
   )# sidebarLayout
)#fluidPage
)#end
  
  
  





  
  
  


library(shiny)
library(shinyBS)
library(plotly)
require(zoo)

shinyUI(fluidPage(
  tags$head( 
 
    tags$link(type = "text/css", href = "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" ,rel="stylesheet"),
    tags$link(type = "text/css", href = "css/myStyles.css" ,rel="stylesheet"),
  
    tags$script(src = "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"),
    HTML('<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>'),
    HTML('<script>
          $().ready(function(){
           $("table.dataTable thead th").each( function() {
                   var a=this.text();
                   console.log(a);
                  
                   this.setAttribute( "title", "You can sort the results" );
                   this.setAttribute("data-toggle","tooltip");
                   } );
          
           $("[data-toggle=tooltip]").tooltip(); 
            
          });
         
         
         </script>
         
         '
      
      
      
    )
  ),
  
  
  
  tags$div(HTML(' 
                <nav class="navbar navbar-inverse navbar-fixed-top" role="navigation" >
                <div class="container">
                <div class="navbar-header">
                <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
                <span class="sr-only">Toggle navigation</span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
                </button>
                </div>
                
                
                
                <div id="navbar" class="navbar-collapse collapse  ">
                
                <ul class="nav navbar-nav">
                <li class="active"  ><a href="https://macroprudential.shinyapps.io/SystemCCA/">Systemic CCA</a></li>
                <li ><a href="https://macroprudential.shinyapps.io/DDSApp/"  target="_self">DDS</a></li>

                <li class="dropdown">
                <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>&nbspAbout</a>
                <ul class="dropdown-menu">
                <li><a href="#">Reference Paper</a></li>
                <li><a href="#">Manual</a></li>
                <li><a href="#">Developer</a></li>
                </ul>
                
                </li>
                </ul>
                
                </div>
                </div>
                </nav>
                <header class="jumbotron">
                
                <!-- Main component for a primary marketing message or call to action -->
                
                <div class="container" >
                <div class="row row-header">
                <div class="col-xs-12 col-sm-4">
                <div id="images">
                <img src="img/imf_seal.png"  >
                <img src="img/imf.png" class="logo">
                </div>
                </div>
                
                
                
                <div class="col-xs-12 col-sm-8">
                <h2>Systemic Contingent Claims Analysis<br> (Systemic CCA)</h2>
                
                </div>
                </div>
                </div>
                </header>





                
              
                ')),

                
          
      
  
      sidebarLayout(
        

        
        sidebarPanel( width=4,
           bsCollapsePanel(
              h4("Data Input Template (Excel)"),
              HTML('<a class="btn btn-primary btn-" href="#">Download</a>'),
                
              
              style = "primary"
            ),         
                      
                      
                      
           bsCollapsePanel(
            h4("Load Data (Excel Format)"),
            
            fileInput("File", label = HTML('<label for="File" class="btn btn-primary btn-md" >Upload</label>')),
           # fileInput("File", label = "File input"),
            
            style = "primary"
          ),#wellPanel1
          
          
          
          conditionalPanel(
            condition = "!!input.start",
           
            bsCollapsePanel(
              h4("Input Parameters"),
              selectInput("start", label = "Start from", choices=list()),
              numericInput("Ex_Window", label ="Extrema Period",
                           value=1,min=1),
              
              numericInput("step", 
                           label ="Step Size", 
                           value = 10) ,
              
              numericInput("window", 
                           label = "Estimation Window Size", 
                           value = 120) ,
              
              actionButton("submit", "Submit", class ="btn-primary"),
              
              
              
              style = "primary"
              
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
              
              
              
              div(style="display:inline-block",
                  tags$label('Log scale on y axis', `for` = "logscale"),
                  HTML('&nbsp') ,
                  tags$input(id="logscale", type="checkbox")
              ), 
              br(),
              
              
              downloadButton('downloadData', 'Download', class="btn-primary"),
              
              
              
              
              
              
              
              
              
              
              
              
              style = "primary"
              
            )#wellPanel3
            
            
            
            
            
          )
          
          
         
        
       
        
         
    
        ),#sidebarPanel
    
  
  


    
     mainPanel(
      
       
               tabsetPanel(
                 tabPanel("Value at Risk",   dataTableOutput('tbVaR')),
                 tabPanel("VaR - Plot", plotlyOutput("VaRPlot")),
                 tabPanel("Expected Shortfall", dataTableOutput('tbES')),
                 tabPanel("ES - Plot", plotlyOutput("ESPlot")),
                 tabPanel("Parameters", dataTableOutput('tbParm'))
                 

                 
                 
                )#tabsetPanel
                                   

               
               )#mianPanel, 
   
     
  
 
    
   )# sidebarLayout

  
)#fluidPage
)#end
  
  
  





  
  
  

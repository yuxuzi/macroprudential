library(shinyBS)
library(shiny)
library(plotly)
require(plotly)
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
                <li  ><a href="https://macroprudential.shinyapps.io/SystemCCA/">Systemic CCA</a></li>
                <li  class="active"><a href="https://macroprudential.shinyapps.io/DDSApp/">DDS</a></li>
                
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
               
                 <h2>Dynamic Dependence Structure (DDS) Model</h2>
                </div>
                </div>
                </div>
                </header>
                
                ')),
  
  
  
  
  
  
  
  
  
  
  
  
  
 
  
                  
                  
                 
  
  
  
  
  
  
  
      sidebarLayout(
        sidebarPanel( 
        
          
          
          bsCollapsePanel(
            h4("Data Input Template (Excel)"),
            HTML('<a class="btn btn-primary btn-" href="#">Download</a>'),
            
            
            style = "primary"
          ),         
          
          
          
          bsCollapsePanel(
            h4("Load Data (Excel Format)"),
            fileInput("File", label = HTML('<label for="File" class="btn btn-primary btn-md" >Upload</label>')),
            htmlOutput("selectUI"),
            
            style = "primary"
          ),#wellPanel1
          
          
          
          conditionalPanel(condition = "!!input.start",
          
          
          bsCollapsePanel(
            h4("Input Parameters"),
        
            selectInput("start", label = "Start from", choices=list()),
                        
            
            numericInput("step", 
                         label ="Step Size", 
                         value = 10) ,
            
            numericInput("window", 
                         label = "Window Size", 
                         value = 20) ,
            
            numericInput("n_quantile", 
                         label = "Quantile Count", 
                         value = 50),
            
            style="primary"
        
        ),#wellPanel2
          
        bsCollapsePanel(
          h4("Plot Dependence Measure"),
          
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
                       value=95,min=1,max=100),
          style="primary"
          
         
        
          
        )#wellPanel3
        
        
        
        
         
    
        )#sidebarPanel
    
  
        ),#conditional panel


    
     mainPanel(plotOutput("Plot", height="600px"),
               
               br(),
               
               plotlyOutput("trendPlot")
               
               )#mianPanel, 
     
  

     

   )# sidebarLayout
)#fluidPage
)#end
  
  
  





  
  
  
